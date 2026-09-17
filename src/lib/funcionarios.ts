// src/lib/funcionarios.ts
// Dados brutos de funcionários para importação inicial, extraídos de Colaboradores.xlsx.
// Colaboradores sem matrícula (bolsistas) têm matricula: undefined.
export interface FuncionarioImportado {
  nome: string;
  matricula?: string;
  eh_almoxarife: boolean;
}

export const funcionarios: FuncionarioImportado[] = [
  { nome: "ALLISON ABIASAF ROCHA DE FREITAS", matricula: "9114825", eh_almoxarife: false },
  { nome: "ARTHUR PEREIRA RAMOS AMARAL", matricula: "9118339", eh_almoxarife: false },
  { nome: "CARLOS ALEXANDRE DE MORAIS", matricula: "9117201", eh_almoxarife: false },
  { nome: "CHARLES CANDIDO DOS SANTOS VIEIRA", eh_almoxarife: false },
  { nome: "DOMISLEY DUTRA SILVA", matricula: "9115923", eh_almoxarife: false },
  { nome: "EDUARDO DE CASTRO BARBALHO", matricula: "9115922", eh_almoxarife: false },
  { nome: "ELIAS GABRIEL MAGALHES SILVA", matricula: "9118202", eh_almoxarife: false },
  { nome: "ELTON JUNIOR COSTA", matricula: "9113335", eh_almoxarife: false },
  { nome: "EMANUELE GRACIOSA PEREIRA", matricula: "9116985", eh_almoxarife: false },
  { nome: "ESTER BEATRIZ DOS SANTOS", eh_almoxarife: false },
  { nome: "FAGNER GUILHERME FERREIRA COELHO", matricula: "9115627", eh_almoxarife: false },
  { nome: "FERNANDO ALVES FRANCA", matricula: "9115108", eh_almoxarife: false },
  { nome: "GUILHERME CRISTIANO FRAGA", eh_almoxarife: false },
  { nome: "HERNANE DO BOM SUCESSO XAVIER MOREIRA", matricula: "9111700", eh_almoxarife: false },
  { nome: "HILGNER TADEU AMARAL DE MELO", matricula: "9117330", eh_almoxarife: false },
  { nome: "HUMBERTO ALVES DA SILVEIRA MONTEIRO", matricula: "9115673", eh_almoxarife: false },
  { nome: "IGOR HENRIQUE XAVIER DE OLIVEIRA", matricula: "9111013", eh_almoxarife: false },
  { nome: "ISABELLA TEIXEIRA REZENDE", eh_almoxarife: false },
  { nome: "JOÃO FLÁVIO MARTINS PEREIRA", eh_almoxarife: false },
  { nome: "JOAO GUSTAVO HENRIQUE", matricula: "9114653", eh_almoxarife: false },
  { nome: "JOAO HENRIQUE RODRIGUES COSTA", matricula: "9112429", eh_almoxarife: false },
  { nome: "JOÃO PEDRO ROCHA NUNES", matricula: "9118326", eh_almoxarife: false },
  { nome: "JOAO VICTOR PEREIRA FERREIRA", matricula: "9115737", eh_almoxarife: false },
  { nome: "JOÃO VITOR FERREIRA NASCIMENTO", eh_almoxarife: false },
  { nome: "JOAO VITOR FREITAS DE OLIVEIRA", matricula: "9116681", eh_almoxarife: false },
  { nome: "JONATHAN LOPES DE SOUZA", matricula: "9106820", eh_almoxarife: false },
  { nome: "JORGE LUIS DA SILVA REIS", matricula: "9115356", eh_almoxarife: false },
  { nome: "LUCAS AMARAL DE ALVARENGA PIRES", matricula: "9117793", eh_almoxarife: false },
  { nome: "LUCAS HENRIQUE DA SILVA", matricula: "9116979", eh_almoxarife: false },
  { nome: "LUCAS PAGLIONI PATARO FARIA", eh_almoxarife: false },
  { nome: "MARCUS VINICIUS DE PAULA", matricula: "9113658", eh_almoxarife: false },
  { nome: "MARISIA MARIA COSTA", eh_almoxarife: false },
  { nome: "MARLON LEMES DA SILVA", matricula: "9116980", eh_almoxarife: true },
  { nome: "MATEUS EMANUEL SILVA PENA", matricula: "9117917", eh_almoxarife: false },
  { nome: "MAYARA FELICIANO GOMES", eh_almoxarife: false },
  { nome: "PAULO HENRIQUE BARBOSA AMARIM", matricula: "9117913", eh_almoxarife: false },
  { nome: "PEDRO BALDINI VITORIANO CASTRO", matricula: "9115077", eh_almoxarife: false },
  { nome: "PEDRO IVO DE OLIVEIRA TIRONI", matricula: "9115485", eh_almoxarife: false },
  { nome: "ROBERT TULIO FERNANDES SANTIAGO", matricula: "9115773", eh_almoxarife: false },
  { nome: "RODOLFO VINICIUS DE MELO", matricula: "9104802", eh_almoxarife: false },
  { nome: "SHARON TATE ZEFERINO LOURENCO", matricula: "9116588", eh_almoxarife: false },
  { nome: "VINICIUS LOPES DA SILVA", matricula: "9114638", eh_almoxarife: false },
];
