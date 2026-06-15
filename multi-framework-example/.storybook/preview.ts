import { setup } from '@storybook/vue3';
import type { Preview } from '@storybook/react';

import '../vue-components/src/styles/main.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      source: {
        type: 'dynamic',
      },
    },
  },

  tags: ['autodocs'],
};

export default preview;
