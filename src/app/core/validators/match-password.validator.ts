
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador cruzado: comprueba que dos controles de un mismo FormGroup tengan el mismo valor.
 *
 * Uso típico: `password` y `repeatpassword` en formularios de registro.
 *
 * @param controlName Nombre del control base (por ejemplo `password`).
 * @param matchingControlName Nombre del control a comparar (por ejemplo `repeatpassword`).
 */
export function matchPasswordValidator(
  controlName: string,
  matchingControlName: string
): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const control = formGroup.get(controlName);
    const matchingControl = formGroup.get(matchingControlName);

    if (!control || !matchingControl || (matchingControl.errors && !matchingControl.errors['matchError'])) {
      return null;
    }

    if (control.value !== matchingControl.value) {
      matchingControl.setErrors({ matchError: true });
      return { matchError: true }; 
    } else {
      if (matchingControl.errors && matchingControl.errors['matchError']) {
          matchingControl.setErrors(null);
      }
      return null;
    }
  };
}