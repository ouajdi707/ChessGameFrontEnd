import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  isLoading: boolean = false;
  
  // Form validation states
  usernameTouched: boolean = false;
  passwordTouched: boolean = false;
  showPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  showToastMessage(message: string, type: 'success' | 'error' | 'info') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }

  getUsernameError(): string {
    if (!this.usernameTouched) return '';
    if (!this.username || this.username.trim().length === 0) {
      return 'Username is required';
    }
    if (this.username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    return '';
  }

  getPasswordError(): string {
    if (!this.passwordTouched) return '';
    if (!this.password || this.password.length === 0) {
      return 'Password is required';
    }
    return '';
  }

  isFormValid(): boolean {
    return !this.getUsernameError() && !this.getPasswordError() && 
           this.username.length >= 3 && this.password.length > 0;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    this.usernameTouched = true;
    this.passwordTouched = true;

    if (!this.isFormValid()) {
      this.showToastMessage('Please fill in all fields correctly', 'error');
      return;
    }

    this.isLoading = true;

    this.authService.login({
      username: this.username.trim(),
      password: this.password
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.token) {
          this.showToastMessage('Welcome back! Redirecting...', 'success');
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1500);
        } else {
          this.showToastMessage(response.message || 'Login failed', 'error');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.showToastMessage(
          error.error?.message || 'Invalid credentials. Please try again.',
          'error'
        );
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
