import { Locator, Page } from '@playwright/test';
import BaseElements from './BaseElements';

export default class AutomationExerciseElements extends BaseElements {
  constructor(readonly page: Page) {
    super(page);
    this.page = page;
  }

  // Homepage
  getHeader(): Locator {
    return this.page.locator('header#header');
  }

  getLogo(): Locator {
    return this.page.locator('img[alt="Website for automation practice"]');
  }

  getCarouselSlider(): Locator {
    return this.page.locator('#slider');
  }

  // Top menu (shared across pages)
  getMenuProductsLink(): Locator {
    return this.page.locator('div.shop-menu ul.nav li a[href="/products"]');
  }

  getMenuContactUsLink(): Locator {
    return this.page.locator('div.shop-menu ul.nav li a[href="/contact_us"]');
  }

  // Products search
  getSearchProductField(): Locator {
    return this.page.locator('#search_product');
  }

  getSearchProductButton(): Locator {
    return this.page.locator('#submit_search');
  }

  getSearchedProductsHeading(): Locator {
    return this.page.locator('h2.title.text-center', { hasText: 'Searched Products' });
  }

  getSearchedProductsList(): Locator {
    return this.page.locator('.features_items .product-image-wrapper');
  }

  // Contact form
  getContactGetInTouchHeading(): Locator {
    return this.page.locator('div.contact-form h2.title');
  }

  getContactNameField(): Locator {
    return this.page.locator('input[data-qa="name"]');
  }

  getContactEmailField(): Locator {
    return this.page.locator('input[data-qa="email"]');
  }

  getContactSubjectField(): Locator {
    return this.page.locator('input[data-qa="subject"]');
  }

  getContactMessageField(): Locator {
    return this.page.locator('textarea[data-qa="message"]');
  }

  getContactSubmitButton(): Locator {
    return this.page.locator('input[data-qa="submit-button"]');
  }

  getContactSuccessMessage(): Locator {
    // O site tem dois <div class="status alert alert-success">: um placeholder
    // vazio que vive sempre no DOM e outro injetado após o submit com o texto
    // de confirmação. Usar getByText filtra pelo nó de texto correto.
    return this.page.getByText('Success! Your details have been submitted successfully.');
  }
}
