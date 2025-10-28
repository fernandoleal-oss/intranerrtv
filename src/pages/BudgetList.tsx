// NO BudgetPdf.tsx - ATUALIZAR A SEÇÃO DE RESUMO FINANCEIRO:

{/* Resumo Financeiro - CONDICIONAL BASEADO NO MODO */}
{(totaisPorCampanha.length > 0 || totalGeral > 0 || isFornecedoresFases) && (
  <div
    className="avoid-break mt-8 p-6 rounded-xl border"
    style={{
      background: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
      border: "2px solid #E2E8F0",
    }}
  >
    <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", color: "#1E293B" }}>
      Resumo Financeiro
    </h2>

    {/* Indicador do Modo no PDF */}
    {payload.totalDisplayMode === "valores_individuais" && (
      <div
        className="mb-4 p-3 rounded-lg border"
        style={{
          backgroundColor: "#EFF6FF",
          border: "1px solid #3B82F6",
        }}
      >
        <div className="flex items-center gap-2 justify-center">
          <List className="h-4 w-4 text-blue-600" />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#1E40AF" }}>
            MODO INDIVIDUAL - VALORES POR ITEM/CAMPANHA
          </span>
        </div>
      </div>
    )}

    {/* Totais por Fornecedor (nova estrutura) */}
    {isFornecedoresFases && (
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#475569" }}>
          Totais por Fornecedor
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "12px" }}>
          {(payload.fornecedores || []).map((fornecedor: Fornecedor, index: number) => {
            const totalFornecedor = fornecedor.fases.reduce((totalFase: number, fase: FornecedorFase) => 
              totalFase + fase.itens.reduce((totalItem: number, item: FornecedorItem) => 
                totalItem + item.valor, 0), 0);
            
            return (
              <div
                key={fornecedor.id || index}
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 8,
                  padding: "12px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: "13px", color: "#1E293B" }}>
                    {fornecedor.nome || `Fornecedor ${index + 1}`}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "14px", color: "#0369A1" }}>
                    {money(totalFornecedor)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Totais por Campanha (estrutura antiga) */}
    {!isFornecedoresFases && totaisPorCampanha.length > 0 && (
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#475569" }}>
          Totais por Campanha
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "12px" }}>
          {totaisPorCampanha.map((t) => (
            <div
              key={t.id}
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                padding: "12px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: "13px", color: "#1E293B" }}>{t.nome}</span>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#E6191E" }}>{money(t.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Total Geral - APENAS SE MODO TOTAL ESTIVER ATIVO */}
    {payload.totalDisplayMode === "somar_total" && totalGeral > 0 && (
      <div
        className="avoid-break"
        style={{
          padding: "16px",
          background: "#FFFFFF",
          border: "2px solid #E6191E",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", marginBottom: "4px" }}>
          TOTAL GERAL
        </p>
        <p style={{ fontSize: "24px", fontWeight: "bold", color: "#E6191E" }}>{money(totalGeral)}</p>
      </div>
    )}

    {/* ... (observações e pendente de faturamento) */}
  </div>
)}