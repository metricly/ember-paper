/**
 * @module ember-paper
 */
import { inject as service } from '@ember/service';

import { or } from '@ember/object/computed';
import $ from 'jquery';
import Component from '@ember/component';
import { computed } from '@ember/object';
import { run } from '@ember/runloop';
import { guidFor } from '@ember/object/internals';
import { getOwner } from '@ember/application';
import layout from '../templates/components/paper-toast';
import { invokeAction } from 'ember-invoke-action';

/**
 * @class PaperToast
 * @extends Ember.Component
 */
export default Component.extend({
  layout,
  tagName: '',
  escapeToClose: false,
  swipeToClose: true,
  capsule: false,
  duration: 3000,

  position: 'bottom left',

  left: computed('position', function() {
    let [, x] = this.get('position').split(' ');
    return x === 'left';
  }),

  top: computed('position', function() {
    let [y] = this.get('position').split(' ');
    return y === 'top';
  }),

  // Calculate a default that is always valid for the parent of the backdrop.
  wormholeSelector: '#paper-toast-fab-wormhole',
  defaultedParent: or('parent', 'wormholeSelector'),

  // Calculate the id of the wormhole destination, setting it if need be. The
  // id is that of the 'parent', if provided, or 'paper-wormhole' if not.
  destinationId: computed('defaultedParent', function() {
    let config = getOwner(this).resolveRegistration('config:environment');

    if (config.environment === 'test' && !this.get('parent')) {
      return '#ember-testing';
    }
    let parent = this.get('defaultedParent');
    let $parent = $(parent);
    // If the parent isn't found, assume that it is an id, but that the DOM doesn't
    // exist yet. This only happens during integration tests or if entire application
    // route is a dialog.
    if ($parent.length === 0 && parent.charAt(0) === '#') {
      return `#${parent.substring(1)}`;
    } else {
      let id = $parent.attr('id');
      if (!id) {
        id = `${this.uniqueId}-parent`;
        $parent.get(0).id = id;
      }
      return `#${id}`;
    }
  }),

  // Find the element referenced by destinationId
  destinationEl: computed('destinationId', function() {
    return document.querySelector(this.get('destinationId'));
  }),

  constants: service(),

  _destroyMessage() {
    if (!this.isDestroyed) {
      invokeAction(this, 'onClose');
    }
  },

  init() {
    this._super(...arguments);
    this.uniqueId = guidFor(this);
  },

  willInsertElement() {
    this._super(...arguments);
    $(this.get('destinationId')).addClass('md-toast-animating');
  },

  didInsertElement() {
    this._super(...arguments);

    if (this.get('duration') !== false) {
      let config = getOwner(this).resolveRegistration('config:environment');
      this.timer = run.later(this, '_destroyMessage', (config.environment === 'test') ? 1 : this.get('duration'));
    }

    if (this.get('escapeToClose')) {
      // Adding Listener to body tag, FIXME
      $('body').on(`keydown.${this.uniqueId}`, (e) => {
        if (e.keyCode === this.get('constants.KEYCODE.ESCAPE') && this.get('onClose')) {
          this._destroyMessage();
        }
      });
    }

    let y = this.get('top') ? 'top' : 'bottom';
    $(this.get('destinationId')).addClass(`md-toast-open-${y}`);
  },

  willDestroyElement() {
    this._super(...arguments);
    if (this.get('escapeToClose')) {
      $('body').off(`keydown.${this.uniqueId}`);
    }

    let y = this.get('top') ? 'top' : 'bottom';
    $(this.get('destinationId')).removeClass(`md-toast-open-${y} md-toast-animating`);

    if (this.timer){
      run.cancel(this.timer);
    }
  },

  swipeAction()  {
    if (this.get('swipeToClose')) {
      invokeAction(this, 'onClose');
    }
  }
});
