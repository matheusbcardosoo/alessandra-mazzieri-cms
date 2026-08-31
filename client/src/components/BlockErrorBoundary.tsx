import { Component, type ReactNode } from 'react';

type State = { hasError: boolean };

export class BlockErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1rem', border: '1px dashed #f87171', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem' }}>
          Bloco indisponível.
        </div>
      );
    }
    return this.props.children;
  }
}
