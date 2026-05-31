<script>
import { useVuelidate } from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { mapGetters } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { useUISettings } from 'dashboard/composables/useUISettings';
import { useConfig } from 'dashboard/composables/useConfig';
import { useAccount } from 'dashboard/composables/useAccount';
import { FEATURE_FLAGS } from '../../../../featureFlags';
import WithLabel from 'v3/components/Form/WithLabel.vue';
import NextInput from 'next/input/Input.vue';
import BaseSettingsHeader from '../components/BaseSettingsHeader.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import AccountId from './components/AccountId.vue';
import BuildInfo from './components/BuildInfo.vue';
import AccountDelete from './components/AccountDelete.vue';
import AudioTranscription from './components/AudioTranscription.vue';
import SectionLayout from './components/SectionLayout.vue';
import AlgThemeControl from 'dashboard/components-next/algorythmo/AlgThemeControl.vue';

export default {
  components: {
    BaseSettingsHeader,
    NextButton,
    Icon,
    AccountId,
    BuildInfo,
    AccountDelete,
    AudioTranscription,
    SectionLayout,
    WithLabel,
    NextInput,
    AlgThemeControl,
  },
  setup() {
    const { updateUISettings, uiSettings } = useUISettings();
    const { enabledLanguages } = useConfig();
    const { accountId } = useAccount();
    const v$ = useVuelidate();

    return { updateUISettings, uiSettings, v$, enabledLanguages, accountId };
  },
  data() {
    return {
      id: '',
      name: '',
      locale: 'en',
      domain: '',
      supportEmail: '',
      features: {},
      logoFile: null,
      logoPreview: '',
    };
  },
  validations: {
    name: {
      required,
    },
    locale: {
      required,
    },
  },
  computed: {
    ...mapGetters({
      getAccount: 'accounts/getAccount',
      uiFlags: 'accounts/getUIFlags',
      isFeatureEnabledonAccount: 'accounts/isFeatureEnabledonAccount',
      isOnChatwootCloud: 'globalConfig/isOnChatwootCloud',
    }),
    showAudioTranscriptionConfig() {
      return this.isFeatureEnabledonAccount(
        this.accountId,
        FEATURE_FLAGS.CAPTAIN
      );
    },
    languagesSortedByCode() {
      const enabledLanguages = [...this.enabledLanguages];
      return enabledLanguages.sort((l1, l2) =>
        l1.iso_639_1_code.localeCompare(l2.iso_639_1_code)
      );
    },
    isUpdating() {
      return this.uiFlags.isUpdating;
    },
    featureInboundEmailEnabled() {
      return !!this.features?.inbound_emails;
    },
    featureCustomReplyDomainEnabled() {
      return (
        this.featureInboundEmailEnabled && !!this.features.custom_reply_domain
      );
    },
    featureCustomReplyEmailEnabled() {
      return (
        this.featureInboundEmailEnabled && !!this.features.custom_reply_email
      );
    },
    currentAccount() {
      return this.getAccount(this.accountId) || {};
    },
    // Locally-selected file (object URL) wins so the user sees their pick
    // before saving; otherwise show the logo persisted on the account.
    displayedLogo() {
      return this.logoPreview || this.currentAccount.logo_url || '';
    },
  },
  mounted() {
    this.initializeAccount();
  },
  beforeUnmount() {
    this.clearLogoPreviewUrl();
  },
  methods: {
    async initializeAccount() {
      try {
        const { name, locale, id, domain, support_email, features } =
          this.getAccount(this.accountId);

        const effectiveLocale = this.uiSettings?.locale || locale;
        if (effectiveLocale) {
          this.$root.$i18n.locale = effectiveLocale;
        }
        this.name = name;
        this.locale = locale;
        this.id = id;
        this.domain = domain;
        this.supportEmail = support_email;
        this.features = features;
      } catch (error) {
        // Ignore error
      }
    },

    async updateAccount() {
      this.v$.$touch();
      if (this.v$.$invalid) {
        useAlert(this.$t('GENERAL_SETTINGS.FORM.ERROR'));
        return;
      }
      try {
        const payload = {
          locale: this.locale,
          name: this.name,
          domain: this.domain,
          support_email: this.supportEmail,
        };
        // Only attach the logo when the user picked a new file; the store
        // switches to multipart automatically when a File is present.
        if (this.logoFile) {
          payload.logo = this.logoFile;
        }
        await this.$store.dispatch('accounts/update', payload);
        // Clear the local selection — the saved account now carries logo_url.
        this.clearLogoSelection();
        // If user locale is set, update the locale with user locale
        const updatedLocale = this.uiSettings?.locale || this.locale;
        if (updatedLocale) {
          this.$root.$i18n.locale = updatedLocale;
        }
        this.getAccount(this.id).locale = this.locale;
        useAlert(this.$t('GENERAL_SETTINGS.UPDATE.SUCCESS'));
      } catch (error) {
        // Surface the backend validation reason (e.g. logo filetype/size) when
        // present, instead of a generic error the user can't act on.
        useAlert(
          error?.response?.data?.message ||
            this.$t('GENERAL_SETTINGS.UPDATE.ERROR')
        );
      }
    },

    onLogoSelect(event) {
      const file = event.target?.files?.[0];
      if (!file) return;
      // Revoke any previous object URL before creating a new one.
      this.clearLogoPreviewUrl();
      this.logoFile = file;
      this.logoPreview = URL.createObjectURL(file);
    },

    clearLogoPreviewUrl() {
      if (this.logoPreview) {
        URL.revokeObjectURL(this.logoPreview);
      }
    },

    clearLogoSelection() {
      this.clearLogoPreviewUrl();
      this.logoFile = null;
      this.logoPreview = '';
      if (this.$refs.logoInput) {
        this.$refs.logoInput.value = '';
      }
    },

    async removeLogo() {
      // If the unsaved local pick is showing, just drop it without a request.
      if (this.logoFile) {
        this.clearLogoSelection();
        return;
      }
      try {
        await this.$store.dispatch('accounts/removeLogo');
        useAlert(this.$t('GENERAL_SETTINGS.ACCOUNT_LOGO.REMOVE_SUCCESS'));
      } catch (error) {
        useAlert(this.$t('GENERAL_SETTINGS.ACCOUNT_LOGO.REMOVE_ERROR'));
      }
    },
  },
};
</script>

<template>
  <div class="flex flex-col w-full max-w-2xl ltr:mr-auto rtl:ml-auto">
    <BaseSettingsHeader :title="$t('GENERAL_SETTINGS.TITLE')" />
    <div class="flex-grow flex-shrink min-w-0 mt-3">
      <SectionLayout
        :title="$t('GENERAL_SETTINGS.FORM.GENERAL_SECTION.TITLE')"
        :description="$t('GENERAL_SETTINGS.FORM.GENERAL_SECTION.NOTE')"
        class="!pt-0"
      >
        <form
          v-if="!uiFlags.isFetchingItem"
          class="grid gap-4"
          @submit.prevent="updateAccount"
        >
          <WithLabel
            name="account-logo"
            :label="$t('GENERAL_SETTINGS.ACCOUNT_LOGO.LABEL')"
          >
            <div class="flex items-center gap-4">
              <div
                class="flex items-center justify-center overflow-hidden rounded-lg size-16 shrink-0 bg-n-slate-3 border border-n-weak"
              >
                <img
                  v-if="displayedLogo"
                  :src="displayedLogo"
                  :alt="$t('GENERAL_SETTINGS.ACCOUNT_LOGO.PREVIEW_ALT')"
                  class="object-contain size-full"
                />
                <Icon
                  v-else
                  icon="i-lucide-image"
                  class="size-6 text-n-slate-10"
                />
              </div>
              <div class="flex items-center gap-2">
                <NextButton
                  faded
                  slate
                  type="button"
                  :label="
                    displayedLogo
                      ? $t('GENERAL_SETTINGS.ACCOUNT_LOGO.REPLACE')
                      : $t('GENERAL_SETTINGS.ACCOUNT_LOGO.UPLOAD')
                  "
                  @click="$refs.logoInput.click()"
                />
                <NextButton
                  v-if="displayedLogo"
                  ghost
                  ruby
                  type="button"
                  :label="$t('GENERAL_SETTINGS.ACCOUNT_LOGO.REMOVE')"
                  @click="removeLogo"
                />
              </div>
              <input
                ref="logoInput"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                class="hidden"
                @change="onLogoSelect"
              />
            </div>
            <template #help>
              {{ $t('GENERAL_SETTINGS.ACCOUNT_LOGO.HELP') }}
            </template>
          </WithLabel>
          <WithLabel
            name="account-name"
            :has-error="v$.name.$error"
            :label="$t('GENERAL_SETTINGS.FORM.NAME.LABEL')"
            :error-message="$t('GENERAL_SETTINGS.FORM.NAME.ERROR')"
          >
            <NextInput
              v-model="name"
              type="text"
              class="w-full"
              :placeholder="$t('GENERAL_SETTINGS.FORM.NAME.PLACEHOLDER')"
              @blur="v$.name.$touch"
            />
          </WithLabel>
          <WithLabel
            name="site-language"
            :has-error="v$.locale.$error"
            :label="$t('GENERAL_SETTINGS.FORM.LANGUAGE.LABEL')"
            :error-message="$t('GENERAL_SETTINGS.FORM.LANGUAGE.ERROR')"
          >
            <select v-model="locale" class="!mb-0 text-sm">
              <option
                v-for="lang in languagesSortedByCode"
                :key="lang.iso_639_1_code"
                :value="lang.iso_639_1_code"
              >
                {{ lang.name }}
              </option>
            </select>
          </WithLabel>
          <WithLabel
            v-if="featureCustomReplyDomainEnabled"
            name="custom-domain"
            :label="$t('GENERAL_SETTINGS.FORM.DOMAIN.LABEL')"
          >
            <NextInput
              v-model="domain"
              type="text"
              class="w-full"
              :placeholder="$t('GENERAL_SETTINGS.FORM.DOMAIN.PLACEHOLDER')"
            />
            <template #help>
              {{
                featureInboundEmailEnabled &&
                $t('GENERAL_SETTINGS.FORM.FEATURES.INBOUND_EMAIL_ENABLED')
              }}

              {{
                featureCustomReplyDomainEnabled &&
                $t('GENERAL_SETTINGS.FORM.FEATURES.CUSTOM_EMAIL_DOMAIN_ENABLED')
              }}
            </template>
          </WithLabel>
          <WithLabel
            v-if="featureCustomReplyEmailEnabled"
            name="support-email"
            :label="$t('GENERAL_SETTINGS.FORM.SUPPORT_EMAIL.LABEL')"
          >
            <NextInput
              v-model="supportEmail"
              type="text"
              class="w-full"
              :placeholder="
                $t('GENERAL_SETTINGS.FORM.SUPPORT_EMAIL.PLACEHOLDER')
              "
            />
          </WithLabel>
          <div>
            <NextButton blue :is-loading="isUpdating" type="submit">
              {{ $t('GENERAL_SETTINGS.SUBMIT') }}
            </NextButton>
          </div>
        </form>
      </SectionLayout>

      <SectionLayout
        v-if="!uiFlags.isFetchingItem"
        with-border
        :title="$t('GENERAL_SETTINGS.FORM.APPEARANCE_SECTION.TITLE')"
        :description="$t('GENERAL_SETTINGS.FORM.APPEARANCE_SECTION.NOTE')"
      >
        <WithLabel
          name="appearance-theme"
          :label="$t('GENERAL_SETTINGS.FORM.APPEARANCE_SECTION.LABEL')"
        >
          <AlgThemeControl />
          <template #help>
            {{ $t('GENERAL_SETTINGS.FORM.APPEARANCE_SECTION.HELP') }}
          </template>
        </WithLabel>
      </SectionLayout>

      <woot-loading-state v-if="uiFlags.isFetchingItem" />
    </div>
    <AudioTranscription v-if="showAudioTranscriptionConfig" />
    <AccountId />
    <div v-if="!uiFlags.isFetchingItem && isOnChatwootCloud">
      <AccountDelete />
    </div>
    <BuildInfo />
  </div>
</template>
