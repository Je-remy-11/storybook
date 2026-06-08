import type { Meta, StoryObj } from '@storybook/vue3';
import Card from './Card.vue';
import Button from './Button.vue';

const meta: Meta<typeof Card> = {
  title: 'Vue/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    // Card 组件主要通过插槽进行配置，没有复杂的 props
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Basic: Story = {
  render: () => ({
    components: { Card },
    template: `
      <Card>
        这是一个基本的 Card 组件，只有内容区域。
      </Card>
    `,
  }),
};

export const WithHeader: Story = {
  render: () => ({
    components: { Card },
    template: `
      <Card>
        <template #header>
          卡片标题
        </template>
        这是带有标题的 Card 组件。
      </Card>
    `,
  }),
};

export const WithFooter: Story = {
  render: () => ({
    components: { Card, Button },
    template: `
      <Card>
        <template #header>
          用户信息
        </template>
        这是用户的基本信息展示卡片。
        <template #footer>
          <div style="display: flex; gap: 8px;">
            <Button type="primary">确认</Button>
            <Button type="secondary">取消</Button>
          </div>
        </template>
      </Card>
    `,
  }),
};

export const Complete: Story = {
  render: () => ({
    components: { Card, Button },
    template: `
      <Card>
        <template #header>
          产品详情
        </template>
        <div>
          <h3 style="margin-top: 0; color: #333;">Vue 3 组件库</h3>
          <p style="color: #666;">
            一个现代化的 Vue 3 组件库，提供完整的 Storybook 文档支持。
          </p>
          <ul style="padding-left: 20px; color: #666;">
            <li>支持 React 和 Vue 组件混合展示</li>
            <li>完整的 TypeScript 类型支持</li>
            <li>自动生成组件文档</li>
          </ul>
        </div>
        <template #footer>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #666;">版本: 1.0.0</span>
            <div style="display: flex; gap: 8px;">
              <Button type="primary">立即使用</Button>
              <Button type="secondary">了解更多</Button>
            </div>
          </div>
        </template>
      </Card>
    `,
  }),
};
