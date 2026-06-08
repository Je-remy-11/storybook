import React, { useEffect, useRef } from 'react';
import { createApp, Component } from 'vue';

interface VueWrapperProps {
  component: Component;
  [key: string]: any;
}

export const VueWrapper: React.FC<VueWrapperProps> = ({ component, ...props }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const app = createApp(component, props);
      app.mount(ref.current);
      return () => {
        app.unmount();
      };
    }
  }, [component, props]);

  return <div ref={ref} />;
};
