import type { Meta, StoryObj } from '@storybook/vue3';
import Button from './Button.vue';

const meta: Meta<typeof Button> = {
  title: 'Vue/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
      description: '按钮类型',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
    },
    onClick: {
      action: 'clicked',
      description: '点击事件',
    },
  },
  args: {
    type: 'primary',
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    type: 'primary',
  },
  render: (args) => ({
    components: { Button },
    setup() { return { args }; },
    template: '<Button v-bind="args">Primary Button</Button>',
  }),
};

export const Secondary: Story = {
  args: {
    type: 'secondary',
  },
  render: (args) => ({
    components: { Button },
    setup() { return { args }; },
    template: '<Button v-bind="args">Secondary Button</Button>',
  }),
};

export const Danger: Story = {
  args: {
    type: 'danger',
  },
  render: (args) => ({
    components: { Button },
    setup() { return { args }; },
    template: '<Button v-bind="args">Danger Button</Button>',
  }),
};

export const Disabled: Story = {
  args: {
    type: 'primary',
    disabled: true,
  },
  render: (args) => ({
    components: { Button },
    setup() { return { args }; },
    template: '<Button v-bind="args">Disabled Button</Button>',
  }),
};
