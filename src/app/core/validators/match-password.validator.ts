
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

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