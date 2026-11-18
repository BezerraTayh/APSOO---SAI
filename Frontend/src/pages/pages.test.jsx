import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Acesso } from "./auth/Acesso/Acesso";
import Ajuda from "./dashboard/Ajuda/Ajuda";
import { ElementVisoGeral } from "./dashboard/VisaoGeral/VisaoGeral";

describe("renderização das telas", () => {
  it("renderiza a tela de acesso", () => {
    const html = renderToString(<Acesso onLogin={() => {}} />);
    expect(html).toContain("Acesse a sua agenda");
    expect(html).toContain("Entrar na minha conta");
  });

  it("renderiza a central de ajuda", () => {
    const html = renderToString(<Ajuda />);
    expect(html).toContain("Ajuda e FAQ");
    expect(html).toContain("Como adicionar um novo agendamento?");
  });

  it("renderiza o painel com a navegação completa", () => {
    const html = renderToString(<ElementVisoGeral />);
    expect(html).toContain("Visão geral");
    expect(html).toContain("Minha agenda");
    expect(html).toContain("Ajuda e FAQ");
    expect(html).toContain("Agenda de hoje");
  });
});
