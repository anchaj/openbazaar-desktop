import BaseVw from '../baseVw';
import loadTemplate from '../../utils/loadTemplate';
import app from '../../app';
import Profile from '../../models/profile/Profile';
import VerifiedMod from './VerifiedMod';
import { handleLinks } from '../../utils/dom';
import { launchModeratorDetailsModal } from '../../utils/modalManager';
import { getLangByCode } from '../../data/languages';

export default class extends BaseVw {
  constructor(options = {}) {
    const opts = {
      cardState: 'unselected',
      notSelected: 'unselected',
      radioStyle: false,
      controlsOnInvalid: false,
      ...options,
    };

    super(opts);
    this.options = opts;
    this.notSelected = opts.notSelected;
    this.cardState = opts.cardState;

    /* There are 3 valid card states:
       selected: This mod is pre-selected, or was activated by the user.
       unselected: Neutral. No action has been taken by the user on this mod.
       deselected: The user has rejected or turned off this mod.
     */
    const validCardStates = ['selected', 'unselected', 'deselected'];

    if (!validCardStates.includes(this.cardState)) {
      throw new Error('This card does not have a valid card state.');
    }

    if (!this.model || !(this.model instanceof Profile)) {
      throw new Error('Please provide a Profile model.');
    }

    handleLinks(this.el);
  }

  className() {
    return 'moderatorCard clrBr';
  }

  events() {
    return {
      'click .js-viewBtn': 'clickModerator',
      click: 'click',
    };
  }

  clickModerator(e) {
    e.stopPropagation();
    const modModal = launchModeratorDetailsModal({
      model: this.model,
      purchase: this.options.purchase,
      cardState: this.cardState,
    });
    this.listenTo(modModal, 'addAsModerator', () => {
      this.changeSelectState('selected');
    });
  }

  click(e) {
    e.stopPropagation();
    this.rotateSelectState();
  }

  rotateSelectState() {
    if (this.cardState === 'selected' && !this.options.radioStyle) {
      this.changeSelectState(this.notSelected);
    } else {
      this.changeSelectState('selected');
    }
  }

  changeSelectState(cardState) {
    if (cardState !== this.cardState) {
      this.cardState = cardState;
      this.render();
      this.trigger('modSelectChange', {
        selected: cardState === 'selected',
        guid: this.model.id,
      });
    }
  }

  render() {
    super.render();

    let modLanguages = [];
    if (this.model.isModerator) {
      modLanguages = this.model.get('moderatorInfo')
        .get('languages')
        .map(lang => {
          const langData = getLangByCode(lang);
          return langData && langData.name || lang;
        });
    }

    const verifiedMod = app.verifiedMods.get(this.model.get('peerID'));

    loadTemplate('components/moderatorCard.html', (t) => {
      this.$el.html(t({
        cardState: this.cardState,
        displayCurrency: app.settings.get('localCurrency'),
        valid: this.model.isModerator,
        radioStyle: this.options.radioStyle,
        controlsOnInvalid: this.options.controlsOnInvalid,
        verified: !!verifiedMod,
        modLanguages,
        ...this.model.toJSON(),
      }));

      if (this.verifiedMod) this.verifiedMod.remove();

      this.verifiedMod = this.createChild(VerifiedMod, {
        badge: verifiedMod &&
          verifiedMod.get('type').badge || undefined,
        initialState: {
          verified: !!verifiedMod,
          text: !!verifiedMod ?
            app.polyglot.t('verifiedMod.modVerified.titleShort') :
            app.polyglot.t('verifiedMod.modUnverified.titleShort'),
          textClass: 'txB tx5b',
          tipTitle: !!verifiedMod ?
            app.polyglot.t('verifiedMod.modVerified.titleLong') :
            app.polyglot.t('verifiedMod.modUnverified.titleLong'),
          tipBody: !!verifiedMod ?
            app.polyglot.t('verifiedMod.modVerified.tipBody', {
              name: `<b>${app.verifiedMods.data.name}</b>`,
              link: app.verifiedMods.data.link ?
                `<a class="txU noWrap" href="${app.verifiedMods.data.link}" data-open-external>` +
                  `${app.polyglot.t('verifiedMod.modVerified.link')}</a>` :
                '',
            }) :
            app.polyglot.t('verifiedMod.modUnverified.tipBody', {
              name: `<b>${app.verifiedMods.data.name}</b>`,
              not: `<b>${app.polyglot.t('verifiedMod.modUnverified.not')}</b>`,
            }),
        },
      });
      this.getCachedEl('.js-verifiedMod').append(this.verifiedMod.render().el);
    });

    return this;
  }
}
