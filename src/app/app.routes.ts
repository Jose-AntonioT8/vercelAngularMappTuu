import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guards';
import { authGuard } from './core/guards/auth.guards';
import { guestGuard } from './core/guards/guest.guards';
import { ActivitiesCreationComponent } from './features/activities/activities-creation/activities.component';
import { ActivityDetailComponent } from './features/activities/activity-detail/activity-detail.component';
import { ActivitiesUpdateComponent } from './features/activities/activity-update/activity-update.component';
import { CreatedActivitiesComponent } from './features/activities/created-activities/created-activities.component';
import { ListActivitiesComponent } from './features/activities/list-activities/list-activities.component';
import { SavedActivitiesComponent } from './features/activities/saved-activities/saved-activities.component';
import { ActivityTypesCreationComponent } from './features/activity-type/activity-types-creation/activity-types-creation.component';
import { ActivityTypesDetailComponent } from './features/activity-type/activity-types-detail/activity-types-detail.component';
import { ActivityTypesListComponent } from './features/activity-type/activity-types-list/activity-types-list.component';
import { ActivityTypesUpdateComponent } from './features/activity-type/activity-types-update/activity-types-update.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { IaComponent } from './features/ia/ia/ia.component';
import { LandingPageComponent } from './features/landing-page/landing-page.component';
import { MapsComponent } from './features/maps/maps.component';
import { CreatedPlansComponent } from './features/plans/created-plans/created-plans.component';
import { PlansCreationComponent } from './features/plans/plans-creation/plans-creation.component';
import { PlansComponent } from './features/plans/plans-detail/plans.component';
import { PlansListComponent } from './features/plans/plans-list/plans-list.component';
import { PlansUpdateComponent } from './features/plans/plans-update/plans-update.component';
import { SavedPlansComponent } from './features/plans/saved-plans/saved-plans.component';
import { ReportsModerationComponent } from './features/reports/reports-moderation/reports-moderation.component';
import { GlobalSearchComponent } from './features/search/global-search/global-search.component';
import { LoginComponent } from './features/user/login/login.component';
import { ProfileEditComponent } from './features/user/profile/profile-edit.component';
import { ProfileComponent } from './features/user/profile/profile.component';
import { SignupComponent } from './features/user/sign-up/sign-up.component';
// prettier-ignore

/**
 * Tabla de rutas de la app.
 *
 * Convenciones relevantes:
 * - **Rutas públicas**: accesibles sin autenticación (ej: landing, maps).
 * - **Rutas guest**: solo para no autenticados (login/signup).
 * - **Rutas auth**: requieren sesión (canActivate: `authGuard`).
 * - **Rutas admin**: requieren rol admin (canActivate: `adminGuard`).
 *
 * Mantener esta tabla como “fuente de verdad” evita lógica de acceso dispersa
 * en componentes, y permite auditar permisos de forma centralizada.
 */
export const routes: Routes = [
  {path: 'createdPlans', component: CreatedPlansComponent, canActivate: [authGuard]},
  {path: 'ia', component: IaComponent, canActivate: [authGuard]},
  {path: 'savedPlans', component: SavedPlansComponent, canActivate: [authGuard]},
  {path: 'savedActivities', component: SavedActivitiesComponent, canActivate: [authGuard]},
  {path : 'maps', component: MapsComponent},
  {path : 'updatePlan/:id', component: PlansUpdateComponent, canActivate: [authGuard]},
  {path : 'landingPage', component: LandingPageComponent},
  {path : 'search', component: GlobalSearchComponent, canActivate: [authGuard]},
  { path: 'activitiesList', component: ListActivitiesComponent},
  { path: 'createdActivities', component: CreatedActivitiesComponent},
  { path: 'activityDetail/:id', component: ActivityDetailComponent},
  { path: 'updateActivity/:id', component: ActivitiesUpdateComponent},
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'signup', component: SignupComponent, canActivate: [guestGuard] },
  { path: 'about', loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent) },
  { path: 'contact', loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent) },
  { path: 'dashboard', component: DashboardComponent, canActivate: [adminGuard] },
  { path: 'admin/reports', component: ReportsModerationComponent, canActivate: [adminGuard] },
  {path: 'activitiesCreation', component: ActivitiesCreationComponent, canActivate: [authGuard]},
  {path: 'plansDetail/:id', component: PlansComponent, canActivate: [authGuard]},
  {path: 'activityTypeDetail/:id', component: ActivityTypesDetailComponent, canActivate: [adminGuard]},
  {path: 'activityTypesUpdate/:id', component: ActivityTypesUpdateComponent, canActivate: [adminGuard]},
  {path: 'planDetail/:id', component: PlansComponent, canActivate: [authGuard]},
  {path: 'profile', component: ProfileComponent, canActivate: [authGuard]},
  {path: 'profile/edit', component: ProfileEditComponent, canActivate: [authGuard]},
  {path: 'activityTypesCreation', component: ActivityTypesCreationComponent, canActivate: [adminGuard]},
  {path: 'activityTypesList', component: ActivityTypesListComponent, canActivate: [adminGuard]},
  {path: 'plansCreation', component: PlansCreationComponent, canActivate: [authGuard]},
  {path: 'plansList', component: PlansListComponent, canActivate: [authGuard]},
  { path: '', redirectTo: 'landingPage', pathMatch: 'full' },
  { path: '**', redirectTo: 'landingPage' }
];
