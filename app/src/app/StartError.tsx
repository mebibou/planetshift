import { Component, type ReactNode } from 'react';

interface Props {
  fallback: (error: unknown) => ReactNode;
  children: ReactNode;
}

/** Shows `fallback` in place of the app when it throws while drawing. */
export class StartError extends Component<Props, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}
