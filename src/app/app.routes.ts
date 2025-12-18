import { Routes } from '@angular/router';
import { LoginComponent } from './features/user/login/login.component';
import { SignupComponent } from './features/user/sign-up/sign-up.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import {authGuard} from './core/guards/auth.guards';
import {adminGuard} from './core/guards/admin.guards';
import {guestGuard} from './core/guards/guest.guards';
import { PlansUpdateComponent } from './features/plans/plans-update/plans-update.component';

import { LandingPageComponent } from './features/landing-page/landing-page.component';
import { ListActivitiesComponent } from './features/activities/list-activities/list-activities.component';
import { ActivitiesCreationComponent } from './features/activities/activities-creation/activities.component';
import { PlansComponent } from './features/plans/plans-detail/plans.component';
import { ProfileComponent } from './features/user/profile/profile.component';
import { ActivityDetailComponent } from './features/activities/activity-detail/activity-detail.component';
import { ActivitiesUpdateComponent} from './features/activities/activity-update/activity-update.component'
import { ActivityTypesDetailComponent } from './features/activity-type/activity-types-detail/activity-types-detail.component';
import { ActivityTypesUpdateComponent } from './features/activity-type/activity-types-update/activity-types-update.component';
import { ActivityTypesCreationComponent } from './features/activity-type/activity-types-creation/activity-types-creation.component';
import { ActivityTypesListComponent } from './features/activity-type/activity-types-list/activity-types-list.component';
import { PlansCreationComponent } from './features/plans/plans-creation/plans-creation.component';
import { PlansListComponent } from './features/plans/plans-list/plans-list.component';
import { MapsComponent} from './features/maps/maps.component'


export const routes: Routes = [
  {path : 'maps', component: MapsComponent},
  {path : 'updatePlan/:id', component: PlansUpdateComponent, canActivate: [authGuard]},
  {path : 'landingPage', component: LandingPageComponent},
  { path: 'activitiesList', component: ListActivitiesComponent},
  { path: 'activityDetail/:id', component: ActivityDetailComponent},
  { path: 'updateActivity/:id', component: ActivitiesUpdateComponent},
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'signup', component: SignupComponent, canActivate: [guestGuard] },
  { path: 'about', loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent) },
  { path: 'dashboard', component: DashboardComponent, canActivate: [adminGuard] },
  {path: 'activitiesCreation', component: ActivitiesCreationComponent, canActivate: [authGuard]},
  {path: 'plansDetail/:id', component: PlansComponent, canActivate: [authGuard]},
  {path: 'activityTypeDetail/:id', component: ActivityTypesDetailComponent, canActivate: [adminGuard]},
  {path: 'activityTypesUpdate/:id', component: ActivityTypesUpdateComponent, canActivate: [adminGuard]},
  {path: 'planDetail/:id', component: PlansComponent, canActivate: [authGuard]},
  {path: 'profile', component: ProfileComponent, canActivate: [authGuard]},
  {path: 'activityTypesCreation', component: ActivityTypesCreationComponent, canActivate: [adminGuard]},
  {path: 'activityTypesList', component: ActivityTypesListComponent, canActivate: [adminGuard]},
  {path: 'plansCreation', component: PlansCreationComponent, canActivate: [authGuard]},
  {path: 'plansList', component: PlansListComponent, canActivate: [authGuard]},
  { path: '', redirectTo: 'landingPage', pathMatch: 'full' }
];
