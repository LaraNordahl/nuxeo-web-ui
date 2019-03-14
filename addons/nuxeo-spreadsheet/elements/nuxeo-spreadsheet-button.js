/**
(C) Copyright 2017 Nuxeo SA (http://nuxeo.com/) and others.

Licensed under the Apache License, Version 2.0 (the License);
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an AS IS BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Contributors:
   Adilio Araujo <aaraujo@nuxeo.com>
*/
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';

// see https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
          return String.fromCharCode('0x' + p1);
  }));
}

/**
`nuxeo-spreadsheet-button`
@group Nuxeo UI
@element nuxeo-spreadsheet-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles">
      .dialog {
        width: 100%;
        height: 100%;
        padding: 0;
      }

      #iframe {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
      }
    </style>

    <nuxeo-connection id="nxconn"></nuxeo-connection>

    <template is="dom-if" if="[[_isAvailable(nxProvider, columns)]]">
      <div class="action" on-click="_show">
        <paper-icon-button id="button" icon="nuxeo:spreadsheet"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]">[[_label]]</span>
      </div>
      <nuxeo-tooltip for="button">[[_label]]</nuxeo-tooltip>
    </template>

    <paper-dialog id="dialog" class="dialog" with-backdrop="">
      <iframe id="iframe" frameborder="0" scrolling="auto" on-load="_onLoad"></iframe>
    </paper-dialog>
`,

  is: 'nuxeo-spreadsheet-button',
  behaviors: [RoutingBehavior, I18nBehavior, FiltersBehavior],

  properties: {
    nxProvider: {
      type: HTMLElement,
      value: null
    },
    columns: {
      type: Array,
      value: []
    },
    /**
     * `true` if the action should display the label, `false` otherwise.
     */
     showLabel: {
      type: Boolean,
      value: false,
    },
    _label: {
      type: String,
      computed: '_computeLabel(i18n)',
    }
  },

  _isAvailable: function() {
    return (this.nxProvider !== null) && this.columns.length;
  },

  _show: function() {
    var provider = this.nxProvider;

    // convert from provider.sort to sortInfos
    var sortInfos = [];
    Object.keys(provider.sort).forEach(function(key) {
      sortInfos.push({'sortColumn': key, 'sortAscending': provider.sort[key] === 'asc'});
    });

    // convert provider.params and provider.aggregations to properties
    var properties = {};
    if (provider.params) {
      Object.keys(provider.params).forEach(function(key) {
        properties[key] = provider.params[key];
      });
    }
    if (provider.aggregations) {
      Object.keys(provider.aggregations).forEach(function(key) {
        properties[key] = provider.aggregations[key].selection;
      });
    }

    // convert datatable.columns to columns
    var columns = [];
    this.columns.forEach(function(c) {
      if (c.field && !c.hidden) {
        columns.push({label: c.name ? c.name : c.field, field: c.field});
      }
    });

    var state = {
      pageProviderName: provider.provider,
      pageSize: provider.pageSize,
      currentPage: provider.page,
      namedParameters: provider.params,
      searchDocument: {properties: properties},
      sortInfos: sortInfos,
      resultColumns: columns,
      executed: false
    };

    this.$.iframe.src = this.$.nxconn.url + '/spreadsheet/?cv=' +
      encodeURIComponent(b64EncodeUnicode(JSON.stringify(state)));
    this.$.dialog.toggle();
  },

  _close: function() {
    this.$.dialog.toggle();
    this.nxProvider.fetch();
  },

  _onLoad: function() {
    var close = (this.$.iframe.contentDocument || this.$.iframe.contentWindow.document).querySelector('#close');
    if (close) {
      close.addEventListener('click', this._close.bind(this));
    }
  },

  _computeLabel: function() {
    return this.i18n('spreadsheetButton.tooltip');
  }
});