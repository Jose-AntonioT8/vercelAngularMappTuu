import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../common/models/apiurl.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private url = `${apiUrl}/users`;

  constructor(private http: HttpClient) {}

  createUser(userData: any, token: any): Observable<any> {
    return this.http.post(this.url, userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getUsers(token: any): Observable<any> {
    return this.http.get(this.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  updateUser(id: string, userData: any, token: any): Observable<any> {
    return this.http.patch(`${this.url}/${id}`, userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  deleteUser(id: string, token: any): Observable<any> {
    return this.http.delete(`${this.url}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  createActivity(
    id: string,
    activityId: string,
    token: string
  ): Observable<any> {
    const body = { createdActivities: [activityId] }; // Envolver el ID en un array con la clave correcta
    console.log(body);
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
