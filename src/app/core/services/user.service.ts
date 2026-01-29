import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../common/models/apiurl.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private url = `${apiUrl}/users`;

  constructor(private http: HttpClient) {}

  createUser(userData: any): Observable<any> {
    return this.http.post(this.url, userData);
  }

  getUsers(): Observable<any> {
    return this.http.get(this.url);
  }

  updateUser(id: string, userData: any): Observable<any> {
    return this.http.patch(`${this.url}/${id}`, userData);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.url}/${id}`);
  }

  createActivity(
    id: string,
    activityId: string,
    token: string
  ): Observable<any> {
    const body = { createdActivities: [activityId] }; // Envolver el ID en un array con la clave correcta
    return this.http.patch(`${this.url}/${id}/createdActivities`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  createPlan(id: string, planId: string, token: string): Observable<any> {
    const body = { createdPlans: [planId] }; // Envolver el ID en un array con la clave correcta
    return this.http.patch(`${this.url}/${id}/createdPlans`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  saveActivity(id: string, activityId: string, token: string): Observable<any> {
    const body = { savedActivities: [activityId] }; // Envolver el ID en un array con la clave correcta
    return this.http.patch(`${this.url}/${id}/savedActivities`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  savePlan(id: string, planId: string, token: string): Observable<any> {
    const body = { savedPlans: [planId] }; // Envolver el ID en un array con la clave correcta
    return this.http.patch(`${this.url}/${id}/savedPlans`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
