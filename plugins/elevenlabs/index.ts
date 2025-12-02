import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { ElevenlabsIcon } from "./icon";

const elevenlabsPlugin: IntegrationPlugin = {
  type: "elevenlabs",
  label: "ElevenLabs",
  description: "AI voice generation and speech synthesis",

  icon: ElevenlabsIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "Your ElevenLabs API key",
      configKey: "apiKey",
      envVar: "ELEVENLABS_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "elevenlabs.io/app/settings/api-keys",
        url: "https://elevenlabs.io/app/settings/api-keys",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testElevenlabs } = await import("./test");
      return testElevenlabs;
    },
  },

  actions: [
    {
      slug: "text-to-speech",
      label: "Text to Speech",
      description: "Convert text to speech using ElevenLabs voices",
      category: "ElevenLabs",
      stepFunction: "textToSpeechStep",
      stepImportPath: "text-to-speech",
      outputFields: [
        { field: "audioBase64", description: "Base64-encoded audio data" },
        { field: "contentType", description: "Audio content type (e.g., audio/mpeg)" },
      ],
      configFields: [
        {
          key: "voiceId",
          label: "Voice ID",
          type: "template-input",
          placeholder: "21m00Tcm4TlvDq8ikWAM (Rachel)",
          example: "21m00Tcm4TlvDq8ikWAM",
          required: true,
        },
        {
          key: "text",
          label: "Text",
          type: "template-textarea",
          placeholder: "Enter the text to convert to speech...",
          rows: 4,
          example: "Hello, welcome to my application!",
          required: true,
        },
        {
          key: "modelId",
          label: "Model",
          type: "select",
          defaultValue: "eleven_multilingual_v2",
          options: [
            { value: "eleven_multilingual_v2", label: "Multilingual v2 (Best Quality)" },
            { value: "eleven_turbo_v2_5", label: "Turbo v2.5 (Low Latency)" },
            { value: "eleven_turbo_v2", label: "Turbo v2 (Legacy)" },
            { value: "eleven_monolingual_v1", label: "Monolingual v1 (English)" },
            { value: "eleven_flash_v2_5", label: "Flash v2.5 (Fastest)" },
            { value: "eleven_flash_v2", label: "Flash v2 (Legacy Fast)" },
          ],
        },
        {
          type: "group",
          label: "Voice Settings",
          fields: [
            {
              key: "stability",
              label: "Stability (0-1)",
              type: "number",
              placeholder: "0.5",
              min: 0,
            },
            {
              key: "similarityBoost",
              label: "Similarity Boost (0-1)",
              type: "number",
              placeholder: "0.75",
              min: 0,
            },
            {
              key: "style",
              label: "Style (0-1)",
              type: "number",
              placeholder: "0",
              min: 0,
            },
          ],
        },
        {
          type: "group",
          label: "Output Settings",
          fields: [
            {
              key: "outputFormat",
              label: "Output Format",
              type: "select",
              defaultValue: "mp3_44100_128",
              options: [
                { value: "mp3_44100_128", label: "MP3 44.1kHz 128kbps" },
                { value: "mp3_44100_192", label: "MP3 44.1kHz 192kbps" },
                { value: "pcm_16000", label: "PCM 16kHz" },
                { value: "pcm_22050", label: "PCM 22.05kHz" },
                { value: "pcm_24000", label: "PCM 24kHz" },
                { value: "pcm_44100", label: "PCM 44.1kHz" },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "get-voices",
      label: "Get Voices",
      description: "List all available voices in your ElevenLabs account",
      category: "ElevenLabs",
      stepFunction: "getVoicesStep",
      stepImportPath: "get-voices",
      outputFields: [
        { field: "voices", description: "Array of available voices with their IDs and names" },
      ],
      configFields: [],
    },
    {
      slug: "speech-to-text",
      label: "Speech to Text",
      description: "Transcribe audio to text using ElevenLabs",
      category: "ElevenLabs",
      stepFunction: "speechToTextStep",
      stepImportPath: "speech-to-text",
      outputFields: [
        { field: "text", description: "Transcribed text from the audio" },
        { field: "language", description: "Detected language code" },
      ],
      configFields: [
        {
          key: "audioUrl",
          label: "Audio URL",
          type: "template-input",
          placeholder: "https://example.com/audio.mp3 or {{NodeName.url}}",
          example: "https://example.com/recording.mp3",
          required: true,
        },
        {
          key: "languageCode",
          label: "Language Code (Optional)",
          type: "template-input",
          placeholder: "en (auto-detect if empty)",
          example: "en",
        },
      ],
    },
    {
      slug: "sound-effects",
      label: "Generate Sound Effect",
      description: "Generate sound effects from text descriptions",
      category: "ElevenLabs",
      stepFunction: "soundEffectsStep",
      stepImportPath: "sound-effects",
      outputFields: [
        { field: "audioBase64", description: "Base64-encoded audio data" },
        { field: "contentType", description: "Audio content type" },
      ],
      configFields: [
        {
          key: "text",
          label: "Description",
          type: "template-textarea",
          placeholder: "Describe the sound effect you want to generate...",
          rows: 3,
          example: "A gentle rain falling on a rooftop with occasional thunder in the distance",
          required: true,
        },
        {
          key: "durationSeconds",
          label: "Duration (seconds, 0.5-22)",
          type: "number",
          placeholder: "Auto",
          min: 0,
        },
      ],
    },
  ],
};

registerIntegration(elevenlabsPlugin);

export default elevenlabsPlugin;
