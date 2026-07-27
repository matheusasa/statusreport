export function NoProjectAccess() {
  return (
    <div className="card p-10 text-center shadow-card">
      <p className="text-body-lg text-on-surface">Nenhum projeto disponível</p>
      <p className="mx-auto mt-2 max-w-md text-body-md text-on-surface-variant">
        Sua conta ainda não está vinculada a nenhum projeto. Peça a um administrador para liberar o acesso em
        Administração → Usuários.
      </p>
    </div>
  );
}
