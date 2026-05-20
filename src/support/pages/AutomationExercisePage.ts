import { Page, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import AutomationExerciseElements from '../elements/AutomationExerciseElements';
import BasePage from './BasePage';

export default class AutomationExercisePage extends BasePage {
  readonly automationExerciseElements: AutomationExerciseElements;

  constructor(readonly page: Page) {
    super(page);
    this.page = page;
    this.automationExerciseElements = new AutomationExerciseElements(page);
  }

  // Test 1 — Homepage
  async validarHomepageCarregada(): Promise<void> {
    await this.verifyTitle('Automation Exercise');
    await expect(this.automationExerciseElements.getHeader()).toBeVisible();
    await expect(this.automationExerciseElements.getLogo()).toBeVisible();
    await expect(this.automationExerciseElements.getCarouselSlider()).toBeVisible();
  }

  // Test 2 — Search product
  async acessarPaginaDeProdutos(): Promise<void> {
    await this.automationExerciseElements.getMenuProductsLink().click();
    await this.verifyUrl(/.*\/products$/);
  }

  async pesquisarProduto(nome: string): Promise<void> {
    await this.automationExerciseElements.getSearchProductField().fill(nome);
    await this.automationExerciseElements.getSearchProductButton().click();
  }

  async validarResultadosDeBusca(): Promise<void> {
    await expect(this.automationExerciseElements.getSearchedProductsHeading()).toBeVisible();
    const count = await this.automationExerciseElements.getSearchedProductsList().count();
    expect(count).toBeGreaterThan(0);
  }

  // Test 3 — Contact form
  async acessarPaginaDeContato(): Promise<void> {
    // O submit dispara um confirm() nativo. O handler precisa estar registrado
    // antes do click no submit — registramos aqui no início do fluxo.
    this.page.on('dialog', (dialog) => dialog.accept());

    await this.automationExerciseElements.getMenuContactUsLink().click();
    await this.verifyUrl(/.*\/contact_us$/);
    await expect(this.automationExerciseElements.getContactGetInTouchHeading()).toBeVisible();
  }

  async preencherFormularioDeContato(): Promise<void> {
    await this.automationExerciseElements.getContactNameField().fill(faker.person.fullName());
    await this.automationExerciseElements.getContactEmailField().fill(faker.internet.email());
    await this.automationExerciseElements.getContactSubjectField().fill(faker.lorem.sentence(4));
    await this.automationExerciseElements.getContactMessageField().fill(faker.lorem.paragraph());
    await this.automationExerciseElements.getContactSubmitButton().click();
  }

  async validarMensagemDeSucessoDeContato(): Promise<void> {
    await expect(this.automationExerciseElements.getContactSuccessMessage()).toBeVisible({
      timeout: 30000
    });
  }
}
