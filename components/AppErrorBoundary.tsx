import React from 'react';
export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error('workspace_render_error', { name: error.name });
  }
  render() {
    return this.state.failed ? (
      <main className="connection-error">
        <h1>Vamos retomar seu espaço</h1>
        <p>Aconteceu um erro ao abrir esta tela. Seus registros salvos continuam preservados.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Recarregar aplicação
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
