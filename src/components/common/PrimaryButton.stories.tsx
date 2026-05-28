import React from 'react';
import { View } from 'react-native';

import PrimaryButton from './PrimaryButton';

import type { Meta, StoryObj } from '@storybook/react-native';

const PrimaryButtonMeta: Meta<typeof PrimaryButton> = {
  title: 'Components/Common/PrimaryButton',
  component: PrimaryButton,
  argTypes: {
    onPress: { action: 'pressed' },
    variant: {
      control: { type: 'select' },
      options: ['gradient', 'solid', 'outline'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Story />
      </View>
    ),
  ],
};

export default PrimaryButtonMeta;

type Story = StoryObj<typeof PrimaryButton>;

export const Gradient: Story = {
  args: {
    title: 'Gradient Button',
    variant: 'gradient',
  },
};

export const Solid: Story = {
  args: {
    title: 'Solid Button',
    variant: 'solid',
  },
};

export const Outline: Story = {
  args: {
    title: 'Outline Button',
    variant: 'outline',
  },
};

export const Loading: Story = {
  args: {
    title: 'Loading Button',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    title: 'Disabled Button',
    disabled: true,
  },
};

export const Large: Story = {
  args: {
    title: 'Large Button',
    size: 'large',
  },
};

export const Small: Story = {
  args: {
    title: 'Small Button',
    size: 'small',
  },
};
