import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config'; // <--- Importamos la config que acabamos de editar

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));