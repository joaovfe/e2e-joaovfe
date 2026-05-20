import { test } from '@playwright/test';
import { join } from 'path';
import { TheConfig } from 'sicolo';
import AutomationExercisePage from '../support/pages/AutomationExercisePage';

test.describe('Automation Exercise — Cenários E2E', () => {
  const CONFIG = join(__dirname, '../support/fixtures/config.yml');
  let automationExercisePage: AutomationExercisePage;
  const BASE_URL = TheConfig.fromFile(CONFIG)
    .andPath('application.automationExercise')
    .retrieveData();

  test.beforeEach(async ({ page }) => {
    automationExercisePage = new AutomationExercisePage(page);
    await page.goto(BASE_URL);
  });

  test('Verificar homepage carregada com título, header e logo', async () => {
    await automationExercisePage.validarHomepageCarregada();
  });

  test('Buscar produto "T-Shirt" na página de produtos', async () => {
    await automationExercisePage.acessarPaginaDeProdutos();
    await automationExercisePage.pesquisarProduto('T-Shirt');
    await automationExercisePage.validarResultadosDeBusca();
  });

  test('Enviar formulário de contato e validar mensagem de sucesso', async () => {
    await automationExercisePage.acessarPaginaDeContato();
    await automationExercisePage.preencherFormularioDeContato();
    await automationExercisePage.validarMensagemDeSucessoDeContato();
  });
});
