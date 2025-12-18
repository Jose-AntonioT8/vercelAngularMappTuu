import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
}
