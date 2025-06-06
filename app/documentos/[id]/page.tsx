"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import type { DadosProposta, PropostaProcessada } from "@/types/proposta"
import { formatarCamposProposta } from "@/utils/formatters"
import {
  User,
  Car,
  Shield,
  Phone,
  Building,
  CreditCard,
  FileText,
  Save,
  ArrowLeft,
  Loader2,
  AlertCircle,
  MoreVertical,
  Upload,
} from "lucide-react"
import { cloneDeep } from "lodash"
import PageTransition from "@/components/PageTransition"
import { AnimatePresence } from "framer-motion"
import MotionDiv from "@/components/MotionDiv"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { PainelPagamentos } from "@/components/gestao-pagamentos/PainelPagamentos"
import { UploadDocumentos } from "@/app/components/UploadDocumentos"
import { PainelSinistros } from "@/components/gestao-sinistros/PainelSinistros"
import { HistoricoDocumentos } from "@/app/components/HistoricoDocumentos"

type SectionKey = keyof DadosProposta
type NestedField = keyof DadosProposta[SectionKey]

export default function PropostaDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [proposta, setProposta] = useState<PropostaProcessada | null>(null)
  const [editedProposta, setEditedProposta] = useState<DadosProposta | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [tabAtiva, setTabAtiva] = useState("proposta")
  const [propostaAtualizada, setPropostaAtualizada] = useState<any>(null)

  // Ativar a aba correta ao montar a página, se houver parâmetro 'tab' na URL
  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam) {
      setTabAtiva(tabParam)
    }
  }, [searchParams])

  // Efeito para lidar com atualizações da proposta
  useEffect(() => {
    if (propostaAtualizada) {
      const propostaFormatada = {
        ...propostaAtualizada,
        resultado: formatarCamposProposta(propostaAtualizada.resultado)
      }
      setProposta(propostaFormatada)
      setEditedProposta(cloneDeep(propostaFormatada.resultado))
      setPropostaAtualizada(null)
    }
  }, [propostaAtualizada])

  useEffect(() => {
    const fetchProposta = async () => {
      if (!params.id) return

      try {
        setIsLoading(true)
        const { data, error } = await supabase.from("ocr_processamento").select("*").eq("id", params.id).maybeSingle()

        if (error) {
          throw error
        }

        if (data) {
          setPropostaAtualizada(data)
        }
      } catch (error) {
        console.error("Erro ao buscar proposta:", error)
        toast.error("Erro ao carregar os detalhes da proposta.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposta()
  }, [params.id, toast])

  const handleInputChange = (
    section: SectionKey,
    field: string,
    value: string,
    nestedField?: string,
    nestedSubField?: string,
  ) => {
    if (!editedProposta) return

    setEditedProposta((prev) => {
      if (!prev) return prev

      const updated = { ...prev } as DadosProposta

      if (nestedField && nestedSubField) {
        // Handle deeply nested fields (e.g., segurado.endereco.cep)
        const sectionData = updated[section] as Record<string, any>
        sectionData[nestedField] = {
          ...sectionData[nestedField],
          [nestedSubField]: value.toUpperCase(),
        }
      } else if (nestedField) {
        // Handle nested fields (e.g., proposta.numero)
        const sectionData = updated[section] as Record<string, any>
        sectionData[nestedField] = value.toUpperCase()
      } else {
        // Handle direct fields
        const sectionData = updated[section] as Record<string, any>
        sectionData[field] = value.toUpperCase()
      }

      return updated
    })
  }

  const handleSave = async () => {
    if (!proposta || !editedProposta) return

    if (!editedProposta.proposta.numero) {
      toast.error("Número da proposta obrigatório")
      return
    }

    try {
      setIsSaving(true)
      console.log("Salvando proposta", editedProposta)
      const { error } = await supabase
        .from("ocr_processamento")
        .update({ resultado: editedProposta })
        .eq("id", proposta.id)

      if (error) {
        console.error("Erro do Supabase ao salvar:", error)
        throw error
      }

      // Refetch para garantir atualização do estado local
      const { data, error: fetchError } = await supabase.from("ocr_processamento").select("*").eq("id", proposta.id).maybeSingle()
      if (fetchError) {
        console.error("Erro ao buscar proposta após salvar:", fetchError)
      }
      if (data) {
        setPropostaAtualizada(data)
      }

      setIsEditing(false)
      toast.success("Alterações salvas com sucesso!")
    } catch (error) {
      console.error("Erro ao salvar alterações:", error)
      toast.error("Erro ao salvar")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelarDocumento = async () => {
    try {
      const { error } = await supabase
        .from("ocr_processamento")
        .update({ tipo_documento: "cancelado" })
        .eq("id", params.id)

      if (error) throw error

      toast.success("Documento cancelado com sucesso!")
      router.refresh()
      router.push("/documentos")
    } catch (error) {
      console.error("Erro ao cancelar documento:", error)
      toast.error("Erro ao cancelar documento")
    }
  }

  const handleConverterEmApolice = async () => {
    if (!proposta) return;
    try {
      const { error } = await supabase
        .from("ocr_processamento")
        .update({ resultado: { ...proposta.resultado, tipo_documento: "apolice" }, tipo_documento: "apolice" })
        .eq("id", params.id)

      if (error) throw error

      toast.success("Documento convertido em apólice com sucesso!")
      router.push("/documentos?tab=apolices")
    } catch (error) {
      console.error("Erro ao converter em apólice:", error)
      toast.error("Erro ao converter em apólice")
    }
  }

  const handleConverterEmProposta = async () => {
    if (!proposta) return;
    try {
      const { error } = await supabase
        .from("ocr_processamento")
        .update({ resultado: { ...proposta.resultado, tipo_documento: "proposta" }, tipo_documento: "proposta" })
        .eq("id", params.id)

      if (error) throw error

      toast.success("Documento convertido em proposta com sucesso!")
      router.push("/documentos?tab=propostas")
    } catch (error) {
      console.error("Erro ao converter em proposta:", error)
      toast.error("Erro ao converter em proposta")
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
      <div className="container py-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Carregando detalhes da proposta...</p>
        </div>
      </div>
      </ProtectedRoute>
    )
  }

  if (!proposta || !editedProposta) {
    return (
      <ProtectedRoute>
      <div className="container py-8">
          <Card className="bg-black dark:bg-black border border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Proposta não encontrada</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Não foi possível encontrar a proposta solicitada ou ela ainda está em processamento.
            </p>
            <Button onClick={() => router.push("/documentos")}>Voltar para propostas</Button>
          </CardContent>
        </Card>
      </div>
      </ProtectedRoute>
    )
  }

  if (proposta.status !== "concluido") {
    return (
      <ProtectedRoute>
      <div className="container py-8">
          <Card className="bg-black dark:bg-black border border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Proposta em processamento</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Esta proposta ainda está sendo processada. Por favor, aguarde alguns instantes e tente novamente.
            </p>
            <Button onClick={() => router.push("/documentos")}>Voltar para propostas</Button>
          </CardContent>
        </Card>
      </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <PageTransition>
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1]
              }}
            >
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {(proposta as any)?.tipo_documento === 'apolice'
                ? `Apólice ${(editedProposta as any)?.proposta?.apolice || (editedProposta as any)?.proposta?.numero || '#' + ((proposta as any)?.id?.substring(0, 8) || '')}`
                : (proposta as any)?.tipo_documento === 'endosso'
                  ? `Endosso ${(editedProposta as any)?.proposta?.endosso || (editedProposta as any)?.proposta?.numero || '#' + ((proposta as any)?.id?.substring(0, 8) || '')}`
                  : `Proposta ${(editedProposta as any)?.proposta?.numero || '#' + ((proposta as any)?.id?.substring(0, 8) || '')}`
              }
            </h1>
            {proposta && (proposta as any).sinistros && Array.isArray((proposta as any).sinistros) && 
              (proposta as any).sinistros.length > 0 && (
              <Badge 
                className="bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30 cursor-pointer transition-colors text-sm px-3 py-1"
                onClick={() => setTabAtiva("sinistros")}
              >
                Consta Sinistro
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {(editedProposta as any)?.proposta?.cia_seguradora || "Seguradora não identificada"}
          </p>
            </MotionDiv>
            <MotionDiv 
              className="flex items-center gap-4 mt-4 md:mt-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.1,
                ease: [0.4, 0, 0.2, 1]
              }}
            >
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar alterações
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="flex gap-2 w-full items-center">
              {/* Botão Voltar sempre visível */}
              <Button
                variant="outline"
                onClick={() => {
                  const tipo = (proposta as any)?.tipo_documento;
                  let url = "/documentos";
                  if (tipo === "apolice") url += "?tab=apolices";
                  else if (tipo === "proposta") url += "?tab=propostas";
                  else if (tipo === "endosso") url += "?tab=endossos";
                  else if (tipo === "cancelado") url += "?tab=cancelados";
                  router.push(url);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              {/* Desktop: mostra botões restantes */}
              <div className="hidden sm:flex gap-2">
                <Button onClick={() => setIsEditing(true)}>Editar dados</Button>
                {(proposta as any)?.tipo_documento === "proposta" && (
                  <Button 
                    variant="default" 
                    onClick={handleConverterEmApolice}
                    className="!bg-green-600 !text-white !border-none"
                  >
                    Converter em Apólice
                  </Button>
                )}
                {(proposta as any)?.tipo_documento === "apolice" && (
                  <Button 
                    variant="default" 
                    onClick={handleConverterEmProposta}
                    className="!bg-blue-600 !text-white !border-none"
                  >
                    Converter em Proposta
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" className="!bg-red-600 !text-white !border-none">Cancelar Documento</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar Documento</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja cancelar este documento? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelarDocumento} className="!bg-red-600 !text-white !border-none">
                        Confirmar Cancelamento
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {/* Mobile: mostra menu (exceto Voltar) */}
              <div className="flex sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      Editar dados
                    </DropdownMenuItem>
                    {(proposta as any)?.tipo_documento === "proposta" && (
                      <DropdownMenuItem onClick={handleConverterEmApolice}>
                        Converter em Apólice
                      </DropdownMenuItem>
                    )}
                    {(proposta as any)?.tipo_documento === "apolice" && (
                      <DropdownMenuItem onClick={handleConverterEmProposta}>
                        Converter em Proposta
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        document.getElementById("alert-cancelar-doc")?.click()
                      }}
                      className="!text-red-600"
                    >
                      Cancelar Documento
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Botão oculto para disparar o AlertDialog pelo id */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button id="alert-cancelar-doc" style={{ display: "none" }} />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar Documento</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja cancelar este documento? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelarDocumento} className="!bg-red-600 !text-white !border-none">
                        Confirmar Cancelamento
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
            </MotionDiv>
      </div>

          <Tabs defaultValue="proposta" value={tabAtiva} onValueChange={setTabAtiva}>
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.2,
                ease: [0.4, 0, 0.2, 1]
              }}
            >
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="flex-nowrap min-w-max">
            <TabsTrigger value="proposta">
              <FileText className="h-4 w-4 mr-2" />
              Documento
            </TabsTrigger>
            <TabsTrigger value="segurado">
              <User className="h-4 w-4 mr-2" />
              Segurado
            </TabsTrigger>
            <TabsTrigger value="veiculo">
              <Car className="h-4 w-4 mr-2" />
              Veículo
            </TabsTrigger>
            <TabsTrigger value="valores">
              <CreditCard className="h-4 w-4 mr-2" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="sinistros">
              <Shield className="h-4 w-4 mr-2" />
              Sinistros
            </TabsTrigger>
            <TabsTrigger value="anexos">
              <Upload className="h-4 w-4 mr-2" />
              Anexos
            </TabsTrigger>
            <TabsTrigger value="corretor">
              <Building className="h-4 w-4 mr-2" />
              Corretor
            </TabsTrigger>
          </TabsList>
        </div>
            </MotionDiv>

        <TabsContent value="proposta">
              <AnimatePresence mode="wait">
                {tabAtiva === "proposta" && (
                  <MotionDiv
                    key="proposta"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                  >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <MotionDiv
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: 0.1,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>Dados principais da proposta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="numero">Número da Proposta</Label>
                  <Input
                    id="numero"
                    value={(editedProposta as any)?.proposta?.numero || ""}
                    onChange={(e) => handleInputChange("proposta", "numero", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="tipo_seguro">Tipo de Seguro</Label>
                  <Input
                    id="tipo_seguro"
                    value={(editedProposta as any)?.proposta?.tipo_seguro || ""}
                    onChange={(e) => handleInputChange("proposta", "tipo_seguro", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="cia_seguradora">Seguradora</Label>
                  <Input
                    id="cia_seguradora"
                    value={(editedProposta as any)?.proposta?.cia_seguradora || ""}
                    onChange={(e) => handleInputChange("proposta", "cia_seguradora", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-3">
                    <Label htmlFor="vigencia_inicio">Início da Vigência</Label>
                    <Input
                      id="vigencia_inicio"
                      value={(editedProposta as any)?.proposta?.vigencia_inicio || ""}
                      onChange={(e) => handleInputChange("proposta", "vigencia_inicio", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="vigencia_fim">Fim da Vigência</Label>
                    <Input
                      id="vigencia_fim"
                      value={(editedProposta as any)?.proposta?.vigencia_fim || ""}
                      onChange={(e) => handleInputChange("proposta", "vigencia_fim", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
                      </MotionDiv>

                      <MotionDiv
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: 0.2,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader>
                <CardTitle>Detalhes Adicionais</CardTitle>
                <CardDescription>Informações complementares</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="ramo">Ramo</Label>
                  <Input
                    id="ramo"
                    value={(editedProposta as any)?.proposta?.ramo || ""}
                    onChange={(e) => handleInputChange("proposta", "ramo", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="apolice">Apólice</Label>
                  <Input
                    id="apolice"
                    value={(editedProposta as any)?.proposta?.apolice || ""}
                    onChange={(e) => handleInputChange("proposta", "apolice", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="codigo_ci">Código CI</Label>
                  <Input
                    id="codigo_ci"
                    value={(editedProposta as any)?.proposta?.codigo_ci || ""}
                    onChange={(e) => handleInputChange("proposta", "codigo_ci", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="classe_bonus">Classe Bônus</Label>
                  <Input
                    id="classe_bonus"
                    value={(editedProposta as any)?.proposta?.classe_bonus || ""}
                    onChange={(e) => handleInputChange("proposta", "classe_bonus", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
                      </MotionDiv>
          </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
        </TabsContent>

        <TabsContent value="segurado">
              <AnimatePresence mode="wait">
                {tabAtiva === "segurado" && (
                  <MotionDiv
                    key="segurado"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <MotionDiv
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <Card>
                          <CardHeader>
                            <CardTitle>Segurado</CardTitle>
                            <CardDescription>Dados pessoais e contato</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <Label>Nome</Label>
                              <Input value={(editedProposta as any)?.segurado?.nome || ""} onChange={(e) => handleInputChange("segurado", "nome", e.target.value)} disabled={!isEditing} />
                            </div>
                            <div>
                              <Label>CPF</Label>
                              <Input value={(editedProposta as any)?.segurado?.cpf || ""} onChange={(e) => handleInputChange("segurado", "cpf", e.target.value)} disabled={!isEditing} />
                            </div>
                            <div>
                              <Label>Data de Nascimento</Label>
                              <Input value={(editedProposta as any)?.segurado?.nascimento || ""} onChange={(e) => handleInputChange("segurado", "nascimento", e.target.value)} disabled={!isEditing} />
                            </div>
                            <div>
                              <Label>Estado Civil</Label>
                              <Input value={(editedProposta as any)?.segurado?.estado_civil || ""} onChange={(e) => handleInputChange("segurado", "estado_civil", e.target.value)} disabled={!isEditing} />
                            </div>
                            <div>
                              <Label>Profissão</Label>
                              <Input value={(editedProposta as any)?.segurado?.profissao || ""} onChange={(e) => handleInputChange("segurado", "profissao", e.target.value)} disabled={!isEditing} />
                            </div>
                            <div>
                              <Label>Email</Label>
                              <Input value={(editedProposta as any)?.segurado?.email || ""} onChange={(e) => handleInputChange("segurado", "email", e.target.value)} disabled={!isEditing} />
                            </div>
                            <div>
                              <Label>Telefone</Label>
                              <Input value={(editedProposta as any)?.segurado?.telefone || ""} onChange={(e) => handleInputChange("segurado", "telefone", e.target.value)} disabled={!isEditing} />
                            </div>
                          </CardContent>
                        </Card>
                      </MotionDiv>
                      <MotionDiv
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <Card>
                          <CardHeader>
                            <CardTitle>Endereço</CardTitle>
                            <CardDescription>Localização do segurado</CardDescription>
                          </CardHeader>
                          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label>Logradouro</Label>
                              <Input value={(editedProposta as any)?.segurado?.endereco?.logradouro || ""} onChange={(e) => handleInputChange("segurado", "endereco", e.target.value, "endereco", "logradouro")} disabled={!isEditing} />
                            </div>
                            <div>
                              <Label>Número</Label>
                              <Input value={(editedProposta as any)?.segurado?.endereco?.numero || ""} onChange={(e) => handleInputChange("segurado", "endereco", e.target.value, "endereco", "numero")} disabled={!isEditing} />
                            </div>
                            <div>
                              <Label>Complemento</Label>
                              <Input value={(editedProposta as any)?.segurado?.endereco?.complemento || ""} onChange={(e) => handleInputChange("segurado", "endereco", e.target.value, "endereco", "complemento")} disabled={!isEditing} />
                            </div>
                            <div>
                              <Label>Bairro</Label>
                              <Input value={(editedProposta as any)?.segurado?.endereco?.bairro || ""} onChange={(e) => handleInputChange("segurado", "endereco", e.target.value, "endereco", "bairro")} disabled={!isEditing} />
                            </div>
                            <div>
                              <Label>Cidade</Label>
                              <Input value={(editedProposta as any)?.segurado?.endereco?.cidade || ""} onChange={(e) => handleInputChange("segurado", "endereco", e.target.value, "endereco", "cidade")} disabled={!isEditing} />
                            </div>
                            <div>
                              <Label>Estado</Label>
                              <Input value={(editedProposta as any)?.segurado?.endereco?.estado || ""} onChange={(e) => handleInputChange("segurado", "endereco", e.target.value, "endereco", "estado")} disabled={!isEditing} />
                            </div>
                            <div>
                              <Label>CEP</Label>
                              <Input value={(editedProposta as any)?.segurado?.endereco?.cep || ""} onChange={(e) => handleInputChange("segurado", "endereco", e.target.value, "endereco", "cep")} disabled={!isEditing} />
                            </div>
                          </CardContent>
                        </Card>
                      </MotionDiv>
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
        </TabsContent>

        <TabsContent value="veiculo">
              <AnimatePresence mode="wait">
                {tabAtiva === "veiculo" && (
                  <MotionDiv
                    key="veiculo"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                  >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <MotionDiv
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: 0.1,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>Dados principais do veículo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="marca_modelo">Marca/Modelo</Label>
                  <Input
                    id="marca_modelo"
                    value={(editedProposta as any)?.veiculo?.marca_modelo || ""}
                    onChange={(e) => handleInputChange("veiculo", "marca_modelo", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-3">
                    <Label htmlFor="ano_fabricacao">Ano de Fabricação</Label>
                    <Input
                      id="ano_fabricacao"
                      value={(editedProposta as any)?.veiculo?.ano_fabricacao || ""}
                      onChange={(e) => handleInputChange("veiculo", "ano_fabricacao", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="ano_modelo">Ano do Modelo</Label>
                    <Input
                      id="ano_modelo"
                      value={(editedProposta as any)?.veiculo?.ano_modelo || ""}
                      onChange={(e) => handleInputChange("veiculo", "ano_modelo", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="placa">Placa</Label>
                  <Input
                    id="placa"
                    value={(editedProposta as any)?.veiculo?.placa || ""}
                    onChange={(e) => handleInputChange("veiculo", "placa", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="chassi">Chassi</Label>
                  <Input
                    id="chassi"
                    value={(editedProposta as any)?.veiculo?.chassi || ""}
                    onChange={(e) => handleInputChange("veiculo", "chassi", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="codigo_fipe">Código FIPE</Label>
                  <Input
                    id="codigo_fipe"
                    value={(editedProposta as any)?.veiculo?.codigo_fipe || ""}
                    onChange={(e) => handleInputChange("veiculo", "codigo_fipe", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
                      </MotionDiv>

                      <MotionDiv
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: 0.2,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader>
                <CardTitle>Características</CardTitle>
                <CardDescription>Detalhes do veículo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="combustivel">Combustível</Label>
                  <Input
                    id="combustivel"
                    value={(editedProposta as any)?.veiculo?.combustivel || ""}
                    onChange={(e) => handleInputChange("veiculo", "combustivel", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="cambio">Câmbio</Label>
                  <Input
                    id="cambio"
                    value={(editedProposta as any)?.veiculo?.cambio || ""}
                    onChange={(e) => handleInputChange("veiculo", "cambio", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    value={(editedProposta as any)?.veiculo?.categoria || ""}
                    onChange={(e) => handleInputChange("veiculo", "categoria", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-3">
                    <Label htmlFor="kit_gas">Kit Gás</Label>
                    <Input
                      id="kit_gas"
                      value={(editedProposta as any)?.veiculo?.kit_gas || ""}
                      onChange={(e) => handleInputChange("veiculo", "kit_gas", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="blindado">Blindado</Label>
                    <Input
                      id="blindado"
                      value={(editedProposta as any)?.veiculo?.blindado || ""}
                      onChange={(e) => handleInputChange("veiculo", "blindado", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="zero_km">Zero KM</Label>
                    <Input
                      id="zero_km"
                      value={(editedProposta as any)?.veiculo?.zero_km || ""}
                      onChange={(e) => handleInputChange("veiculo", "zero_km", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="finalidade_uso">Finalidade de Uso</Label>
                  <Input
                    id="finalidade_uso"
                    value={(editedProposta as any)?.veiculo?.finalidade_uso || ""}
                    onChange={(e) => handleInputChange("veiculo", "finalidade_uso", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
                      </MotionDiv>
          </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
        </TabsContent>

        <TabsContent value="coberturas">
          <div className="space-y-6">
            {(editedProposta as any)?.coberturas &&
              ((editedProposta as any)?.coberturas as DadosProposta['coberturas']).map((cobertura, index) => (
                    <Card key={index} className="bg-black dark:bg-black border border-gray-800">
                  <CardHeader>
                    <CardTitle>{cobertura.tipo || `Cobertura ${index + 1}`}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      <Label htmlFor={`cobertura-tipo-${index}`}>Tipo</Label>
                      <Input
                        id={`cobertura-tipo-${index}`}
                        value={cobertura.tipo || ""}
                        onChange={(e) => {
                          const newCoberturas = [...((editedProposta as any)?.coberturas as DadosProposta['coberturas'])]
                          newCoberturas[index] = { ...newCoberturas[index], tipo: e.target.value }
                          setEditedProposta({ ...editedProposta, coberturas: newCoberturas } as DadosProposta)
                        }}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-3">
                        <Label htmlFor={`cobertura-franquia-${index}`}>Franquia</Label>
                        <Input
                          id={`cobertura-franquia-${index}`}
                          value={cobertura.franquia || ""}
                          onChange={(e) => {
                            const newCoberturas = [...((editedProposta as any)?.coberturas as DadosProposta['coberturas'])]
                            newCoberturas[index] = { ...newCoberturas[index], franquia: e.target.value }
                            setEditedProposta({ ...editedProposta, coberturas: newCoberturas } as DadosProposta)
                          }}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor={`cobertura-limite-${index}`}>Limite de Indenização</Label>
                        <Input
                          id={`cobertura-limite-${index}`}
                          value={cobertura.limite_indenizacao || ""}
                          onChange={(e) => {
                            const newCoberturas = [...((editedProposta as any)?.coberturas as DadosProposta['coberturas'])]
                            newCoberturas[index] = { ...newCoberturas[index], limite_indenizacao: e.target.value }
                            setEditedProposta({ ...editedProposta, coberturas: newCoberturas } as DadosProposta)
                          }}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="assistencias">
          <div className="space-y-6">
                <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader>
                <CardTitle>Carro Reserva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-3">
                    <Label htmlFor="carro-reserva-porte">Porte</Label>
                    <Input
                      id="carro-reserva-porte"
                      value={(editedProposta as any)?.assistencias?.carro_reserva?.porte || ""}
                      onChange={(e) => {
                        setEditedProposta({
                          ...editedProposta,
                          assistencias: {
                            ...(editedProposta as any)?.assistencias,
                            carro_reserva: {
                              ...(editedProposta as any)?.assistencias?.carro_reserva,
                              porte: e.target.value,
                            },
                          },
                        } as DadosProposta)
                      }}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="carro-reserva-dias">Quantidade de Dias</Label>
                    <Input
                      id="carro-reserva-dias"
                      value={(editedProposta as any)?.assistencias?.carro_reserva?.quantidade_dias || ""}
                      onChange={(e) => {
                        setEditedProposta({
                          ...editedProposta,
                          assistencias: {
                            ...(editedProposta as any)?.assistencias,
                            carro_reserva: {
                              ...(editedProposta as any)?.assistencias?.carro_reserva,
                              quantidade_dias: e.target.value,
                            },
                          },
                        } as DadosProposta)
                      }}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

                <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader>
                <CardTitle>Assistência 24h</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Label htmlFor="assistencia-24h">Descrição</Label>
                  <Input
                    id="assistencia-24h"
                    value={(editedProposta as any)?.assistencias?.assistencia_24h || ""}
                    onChange={(e) => {
                      setEditedProposta({
                        ...editedProposta,
                        assistencias: {
                          ...(editedProposta as any)?.assistencias,
                          assistencia_24h: e.target.value,
                        },
                      } as DadosProposta)
                    }}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="corretor">
              <AnimatePresence mode="wait">
                {tabAtiva === "corretor" && (
                  <MotionDiv
                    key="corretor"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Dados do Corretor</CardTitle>
              <CardDescription>Informações do corretor responsável</CardDescription>
            </CardHeader>
                      <CardContent className="space-y-3 pb-4">
                        <div>
                          <Label>Nome</Label>
                          <Input value={(editedProposta as any)?.corretor?.nome || ""} onChange={(e) => handleInputChange("corretor", "nome", e.target.value)} disabled={!isEditing} />
              </div>
                        <div>
                          <Label>SUSEP</Label>
                          <Input value={(editedProposta as any)?.corretor?.susep || ""} onChange={(e) => handleInputChange("corretor", "susep", e.target.value)} disabled={!isEditing} />
              </div>
                        <div>
                          <Label>Email</Label>
                          <Input value={(editedProposta as any)?.corretor?.email || ""} onChange={(e) => handleInputChange("corretor", "email", e.target.value)} disabled={!isEditing} />
              </div>
                        <div>
                          <Label>Telefone</Label>
                          <Input value={(editedProposta as any)?.corretor?.telefone || ""} onChange={(e) => handleInputChange("corretor", "telefone", e.target.value)} disabled={!isEditing} />
              </div>
            </CardContent>
          </Card>
                  </MotionDiv>
                )}
              </AnimatePresence>
        </TabsContent>

        <TabsContent value="valores">
              <AnimatePresence mode="wait">
                {tabAtiva === "valores" && (
                  <MotionDiv
                    key="valores"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <MotionDiv
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
                        >
                        <Card className="bg-black dark:bg-black border border-gray-800">
                          <CardHeader>
                            <CardTitle>Valores</CardTitle>
                            <CardDescription>Informações financeiras</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-3">
                              <Label htmlFor="preco-total">Prêmio Total</Label>
                              <Input
                                id="preco-total"
                                value={(editedProposta as any)?.valores?.preco_total || ""}
                                onChange={(e) => handleInputChange("valores", "preco_total", e.target.value)}
                                disabled={!isEditing}
                              />
                            </div>
                            <div className="grid gap-3">
                              <Label htmlFor="preco-liquido">Prêmio Líquido</Label>
                              <Input
                                id="preco-liquido"
                                value={(editedProposta as any)?.valores?.preco_liquido || ""}
                                onChange={(e) => handleInputChange("valores", "preco_liquido", e.target.value)}
                                disabled={!isEditing}
                              />
                            </div>
                            <div className="grid gap-3">
                              <Label htmlFor="iof">IOF</Label>
                              <Input
                                id="iof"
                                value={(editedProposta as any)?.valores?.iof || ""}
                                onChange={(e) => handleInputChange("valores", "iof", e.target.value)}
                                disabled={!isEditing}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </MotionDiv>
                      <MotionDiv 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <Card className="bg-black dark:bg-black border border-gray-800">
                          <CardHeader>
                            <CardTitle>Pagamento</CardTitle>
                            <CardDescription>Forma de pagamento e parcelamento</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-3">
                              <Label htmlFor="forma-pagamento">Forma de Pagamento</Label>
                              <Input
                                id="forma-pagamento"
                                value={(editedProposta as any)?.valores?.forma_pagamento || ""}
                                onChange={(e) => handleInputChange("valores", "forma_pagamento", e.target.value)}
                                disabled={!isEditing}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="grid gap-3">
                                <Label htmlFor="parcelas-quantidade">Quantidade de Parcelas</Label>
                                <Input
                                  id="parcelas-quantidade"
                                  value={(editedProposta as any)?.valores?.parcelamento?.quantidade || ""}
                                  onChange={(e) => {
                                    setEditedProposta({
                                      ...editedProposta,
                                      valores: {
                                        ...(editedProposta as any)?.valores,
                                        parcelamento: {
                                          ...(editedProposta as any)?.valores?.parcelamento,
                                          quantidade: e.target.value,
                                        },
                                      },
                                    } as DadosProposta)
                                  }}
                                  disabled={!isEditing}
                                />
                              </div>
                              <div className="grid gap-3">
                                <Label htmlFor="parcelas-valor">Valor da Parcela</Label>
                                <Input
                                  id="parcelas-valor"
                                  value={(editedProposta as any)?.valores?.parcelamento?.valor_parcela || ""}
                                  onChange={(e) => {
                                    setEditedProposta({
                                      ...editedProposta,
                                      valores: {
                                        ...(editedProposta as any)?.valores,
                                        parcelamento: {
                                          ...(editedProposta as any)?.valores?.parcelamento,
                                          valor_parcela: e.target.value,
                                        },
                                      },
                                    } as DadosProposta)
                                  }}
                                  disabled={!isEditing}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </MotionDiv>
                    </div>
                    
                    {/* Painel de Pagamentos */}
                    {proposta && (
                      <MotionDiv
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <PainelPagamentos
                          documentoId={proposta.id}
                          tipoDocumento={(proposta as any)?.tipo_documento || "proposta"}
                          dadosOriginais={proposta.resultado}
                        />
                      </MotionDiv>
                    )}
                  </MotionDiv>
                )}
              </AnimatePresence>
        </TabsContent>

        <TabsContent value="sinistros">
          <AnimatePresence mode="wait">
            {tabAtiva === "sinistros" && (
              <MotionDiv
                key="sinistros"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="grid grid-cols-1 gap-8 max-w-xl mx-0">
                  {proposta && (
                    <PainelSinistros
                      documentoId={proposta.id}
                      tipoDocumento={(proposta as any)?.tipo_documento || "proposta"}
                      vigenciaInicio={(editedProposta as any)?.proposta?.vigencia_inicio}
                      vigenciaFim={(editedProposta as any)?.proposta?.vigencia_fim}
                    />
                  )}
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="anexos">
          <AnimatePresence mode="wait">
            {tabAtiva === "anexos" && (
              <MotionDiv
                key="anexos"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Card de Upload */}
                  <MotionDiv
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <UploadDocumentos 
                      documentoId={proposta.id} 
                      nomeSegurado={(editedProposta as any)?.segurado?.nome || ""}
                    />
                  </MotionDiv>
                  
                  {/* Card de Histórico */}
                  <MotionDiv
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <HistoricoDocumentos 
                      documentoId={proposta.id}
                    />
                  </MotionDiv>
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="todas" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  <Card className="bg-black dark:bg-black border border-gray-800">
                    <CardHeader>
                      <CardTitle>Detalhes da Proposta</CardTitle>
                      <CardDescription>Informações completas da proposta</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold mb-2">Proposta</h3>
                          <p>Número: {(editedProposta as any)?.proposta?.numero || "N/A"}</p>
                          <p>Seguradora: {(editedProposta as any)?.proposta?.cia_seguradora || "N/A"}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Segurado</h3>
                          <p>Nome: {(editedProposta as any)?.segurado?.nome || "N/A"}</p>
                          <p>CPF: {(editedProposta as any)?.segurado?.cpf || "N/A"}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Veículo</h3>
                          <p>Marca/Modelo: {(editedProposta as any)?.veiculo?.marca_modelo || "N/A"}</p>
                          <p>Placa: {(editedProposta as any)?.veiculo?.placa || "N/A"}</p>
                        </div>
                      </div>
              </CardContent>
            </Card>
                </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
      </PageTransition>
    </ProtectedRoute>
  )
}