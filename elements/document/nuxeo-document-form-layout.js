/**
@license
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-form/iron-form.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@polymer/paper-button/paper-button.js';
import './nuxeo-document-layout.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

/**
`nuxeo-document-form-layout`
@group Nuxeo UI
@element nuxeo-document-form-layout
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      #form,
      form {
        @apply --layout-vertical;
        height: 100%;
      }

      .scrollable {
        margin-top: 24px;
        padding: 0 24px;
        @apply --layout-scroll;
        @apply --layout-flex;
        @apply --layout-vertical;
      }

      .actions {
        @apply --buttons-bar;
        @apply --layout-horizontal;
        @apply --layout-justified;
      }

      .saving-label {
        margin-right: 8px;
      }

      nuxeo-document-layout {
        margin-bottom: 24px;
      }
    </style>

    <nuxeo-document
      id="doc"
      doc-id="[[document.uid]]"
      response="{{document}}"
      headers="[[headers]]"
      sync-indexing
    ></nuxeo-document>

    <iron-form id="form">
      <form>
        <div class="scrollable">
          <nuxeo-document-layout id="layout" document="{{document}}" layout="[[layout]]"></nuxeo-document-layout>
        </div>
        <div class="actions">
          <paper-button on-tap="cancel" noink>[[i18n('command.cancel')]]</paper-button>
          <paper-button id="save" on-tap="save" noink class="primary" disabled$="[[saving]]">
            <template is="dom-if" if="[[!saving]]">
              [[i18n('command.save')]]
            </template>
            <template is="dom-if" if="[[saving]]">
              <span class="saving-label">[[i18n('command.save')]]</span>
              <paper-spinner-lite active></paper-spinner-lite>
            </template>
          </paper-button>
        </div>
      </form>
    </iron-form>
  `,

  is: 'nuxeo-document-form-layout',
  behaviors: [IronResizableBehavior, I18nBehavior],

  properties: {
    document: {
      type: Object,
      notify: true,
    },

    layout: {
      type: String,
      value: 'edit',
    },

    headers: {
      type: Object,
    },

    saving: {
      type: Boolean,
      value: false,
    },
  },

  observers: ['_documentChanged(document.*)'],

  _doSave() {
    if (!this.document.uid) {
      // create
      this.$.doc.data = this.document;
      return this.$.doc.post();
    } // edit
    this.$.doc.data = {
      'entity-type': 'document',
      uid: this.document.uid,
      properties: this._dirtyProperties,
    };
    return this.$.doc.put();
  },

  save() {
    const { layout } = this.$.layout.$;
    const elementsToValidate = layout._getValidatableElements(layout.element.root);
    elementsToValidate.push(layout.element);
    let valid = true;
    const validations = [];
    elementsToValidate.forEach((el) => {
      if (el.validate) {
        const elValidate = el.validate();
        if (typeof elValidate.then === 'function') {
          validations.push(elValidate);
        } else {
          valid = valid && elValidate;
        }
      }
    });
    if (!valid) {
      const invalidField = elementsToValidate.find((node) => node.invalid);
      invalidField.scrollIntoView();
      invalidField.focus();
      return;
    }
    this.set('saving', true);
    Promise.all(validations)
      .then(() => this._doSave())
      .then(() => {
        this.set('saving', false);
        this._refresh(this);
      })
      .catch((err) => {
        this.set('saving', false);
        if (err && err['entity-type'] === 'validation_report') {
          this.$.layout.reportValidation(err);
        } else {
          this.fire('notify', { message: this.i18n('documentEdit.saveError') });
          console.error(err);
        }
      });
  },

  cancel() {
    this._refresh();
    this.document = undefined;
  },

  _refresh() {
    this.fire('document-updated');
  },

  _documentChanged(e) {
    if (e.path === 'document') {
      this._dirtyProperties = {};
    } else {
      // copy dirty properties (cannot patch complex or list properties)
      const match = e.path.match(/^document\.properties\.([^.]*)/);
      if (match) {
        const prop = match[1];
        this._dirtyProperties[prop] = this.document.properties[prop];
      }
    }
  },
});
