import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../../common/models/apiurl.model';
@Injectable({ providedIn: 'root' })

export class mapsService{
    constructor(private http: HttpClient
    ) {}
    
    getAddress(lat: number, lon: number): Observable<string> {
        // Nota la URL diferente
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`;
      
        return this.http.get<any>(url).pipe(
          map(response => {
            // La estructura de respuesta es diferente a OSM
            return response.locality || response.city || response.principalSubdivision || 'Ubicación desconocida';
          })
        );
      }
}
