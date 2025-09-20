import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from './api.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  loading = false;
  error = '';

  form = this.fb.group({
    email: ['owner@turbovets.com', [Validators.required, Validators.email]],
    password: ['password', [Validators.required]],
  });

  constructor(private fb: FormBuilder, private api: ApiService, private router: Router) {}

  async submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    try {
      const { email, password } = this.form.value as any;
      const res = await this.api.login(email, password).toPromise();
      localStorage.setItem('jwt', res!.access_token);
      localStorage.setItem('user', JSON.stringify(res!.user));
      this.router.navigateByUrl('/tasks');
    } catch (e: any) {
      this.error = e?.error?.message || 'Login failed';
    } finally {
      this.loading = false;
    }
  }
}
