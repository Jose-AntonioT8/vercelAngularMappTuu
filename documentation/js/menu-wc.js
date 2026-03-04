'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">map-tuu documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                                <li class="link">
                                    <a href="overview.html" data-type="chapter-link">
                                        <span class="icon ion-ios-keypad"></span>Overview
                                    </a>
                                </li>

                            <li class="link">
                                <a href="index.html" data-type="chapter-link">
                                    <span class="icon ion-ios-paper"></span>
                                        README
                                </a>
                            </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>

                    </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#components-links"' :
                            'data-bs-target="#xs-components-links"' }>
                            <span class="icon ion-md-cog"></span>
                            <span>Components</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="components-links"' : 'id="xs-components-links"' }>
                            <li class="link">
                                <a href="components/AboutComponent.html" data-type="entity-link" >AboutComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ActivitiesCreationComponent.html" data-type="entity-link" >ActivitiesCreationComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ActivitiesUpdateComponent.html" data-type="entity-link" >ActivitiesUpdateComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ActivityDetailComponent.html" data-type="entity-link" >ActivityDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ActivitySelectorComponent.html" data-type="entity-link" >ActivitySelectorComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ActivityTypesCreationComponent.html" data-type="entity-link" >ActivityTypesCreationComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ActivityTypesDetailComponent.html" data-type="entity-link" >ActivityTypesDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ActivityTypesListComponent.html" data-type="entity-link" >ActivityTypesListComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ActivityTypesUpdateComponent.html" data-type="entity-link" >ActivityTypesUpdateComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AppComponent.html" data-type="entity-link" >AppComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CardComponent.html" data-type="entity-link" >CardComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CardComponent-1.html" data-type="entity-link" >CardComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CardPlansComponent.html" data-type="entity-link" >CardPlansComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CoordinatesInputComponent.html" data-type="entity-link" >CoordinatesInputComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CreatedActivitiesComponent.html" data-type="entity-link" >CreatedActivitiesComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CreatedPlansComponent.html" data-type="entity-link" >CreatedPlansComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CustomInputComponent.html" data-type="entity-link" >CustomInputComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DashboardComponent.html" data-type="entity-link" >DashboardComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FilterComponent.html" data-type="entity-link" >FilterComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FilterComponent-1.html" data-type="entity-link" >FilterComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FilterPlansComponent.html" data-type="entity-link" >FilterPlansComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FooterComponent.html" data-type="entity-link" >FooterComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/HeaderComponent.html" data-type="entity-link" >HeaderComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/IaComponent.html" data-type="entity-link" >IaComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ImageUploadComponent.html" data-type="entity-link" >ImageUploadComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/LandingPageComponent.html" data-type="entity-link" >LandingPageComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/LanguageSelectorComponent.html" data-type="entity-link" >LanguageSelectorComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ListActivitiesComponent.html" data-type="entity-link" >ListActivitiesComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ListComponent.html" data-type="entity-link" >ListComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ListComponent-1.html" data-type="entity-link" >ListComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ListPlansComponent.html" data-type="entity-link" >ListPlansComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/LoginComponent.html" data-type="entity-link" >LoginComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/MapComponent.html" data-type="entity-link" >MapComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/MapPreviewComponent.html" data-type="entity-link" >MapPreviewComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/MapsComponent.html" data-type="entity-link" >MapsComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OptionsActivityTypesComponent.html" data-type="entity-link" >OptionsActivityTypesComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OptionsComponent.html" data-type="entity-link" >OptionsComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OptionsPlansComponent.html" data-type="entity-link" >OptionsPlansComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/PlansComponent.html" data-type="entity-link" >PlansComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/PlansCreationComponent.html" data-type="entity-link" >PlansCreationComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/PlansListComponent.html" data-type="entity-link" >PlansListComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/PlansUpdateComponent.html" data-type="entity-link" >PlansUpdateComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProfileComponent.html" data-type="entity-link" >ProfileComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ReviewModalComponent.html" data-type="entity-link" >ReviewModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ReviewsListModalComponent.html" data-type="entity-link" >ReviewsListModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SavedActivitiesComponent.html" data-type="entity-link" >SavedActivitiesComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SavedPlansComponent.html" data-type="entity-link" >SavedPlansComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SignupComponent.html" data-type="entity-link" >SignupComponent</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#directives-links"' :
                                'data-bs-target="#xs-directives-links"' }>
                                <span class="icon ion-md-code-working"></span>
                                <span>Directives</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="directives-links"' : 'id="xs-directives-links"' }>
                                <li class="link">
                                    <a href="directives/DefaultAvatarDirective.html" data-type="entity-link" >DefaultAvatarDirective</a>
                                </li>
                                <li class="link">
                                    <a href="directives/Tilt3DDirective.html" data-type="entity-link" >Tilt3DDirective</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/BaseMediaService.html" data-type="entity-link" >BaseMediaService</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/ActivityService.html" data-type="entity-link" >ActivityService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ActivityTypeService.html" data-type="entity-link" >ActivityTypeService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AuthService.html" data-type="entity-link" >AuthService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CloudinaryService.html" data-type="entity-link" >CloudinaryService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/IaAssistantService.html" data-type="entity-link" >IaAssistantService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/mapsService.html" data-type="entity-link" >mapsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/PlanService.html" data-type="entity-link" >PlanService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/TranslationService.html" data-type="entity-link" >TranslationService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/UserService.html" data-type="entity-link" >UserService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/Activity.html" data-type="entity-link" >Activity</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ActivityDetail.html" data-type="entity-link" >ActivityDetail</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ActivityFilterState.html" data-type="entity-link" >ActivityFilterState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ActivityFilterState-1.html" data-type="entity-link" >ActivityFilterState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ActivityFilterState-2.html" data-type="entity-link" >ActivityFilterState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ActivityType.html" data-type="entity-link" >ActivityType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Coordinates.html" data-type="entity-link" >Coordinates</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FilterItem.html" data-type="entity-link" >FilterItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FilterItem-1.html" data-type="entity-link" >FilterItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FilterItem-2.html" data-type="entity-link" >FilterItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IaChatMessage.html" data-type="entity-link" >IaChatMessage</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IaChatResponse.html" data-type="entity-link" >IaChatResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IaFirebaseData.html" data-type="entity-link" >IaFirebaseData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IaRelationalContext.html" data-type="entity-link" >IaRelationalContext</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MapMarkerData.html" data-type="entity-link" >MapMarkerData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MapMarkerData-1.html" data-type="entity-link" >MapMarkerData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Plan.html" data-type="entity-link" >Plan</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Review.html" data-type="entity-link" >Review</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Review-1.html" data-type="entity-link" >Review</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SelectableItem.html" data-type="entity-link" >SelectableItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/User.html" data-type="entity-link" >User</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#pipes-links"' :
                                'data-bs-target="#xs-pipes-links"' }>
                                <span class="icon ion-md-add"></span>
                                <span>Pipes</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="pipes-links"' : 'id="xs-pipes-links"' }>
                                <li class="link">
                                    <a href="pipes/PricePipe.html" data-type="entity-link" >PricePipe</a>
                                </li>
                                <li class="link">
                                    <a href="pipes/TranslatePipe.html" data-type="entity-link" >TranslatePipe</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <a data-type="chapter-link" href="routes.html"><span class="icon ion-ios-git-branch"></span>Routes</a>
                        </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});