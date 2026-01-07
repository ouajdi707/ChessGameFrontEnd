import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  username: string = '';
  email: string = '';
  password: string = '';
  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  isLoading: boolean = false;
  
  // Form validation states
  usernameTouched: boolean = false;
  emailTouched: boolean = false;
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
    if (!/^[a-zA-Z0-9_]+$/.test(this.username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return '';
  }

  getEmailError(): string {
    if (!this.emailTouched) return '';
    if (!this.email || this.email.trim().length === 0) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      return 'Please enter a valid email address';
    }
    return '';
  }

  getPasswordError(): string {
    if (!this.passwordTouched) return '';
    if (!this.password || this.password.length === 0) {
      return 'Password is required';
    }
    if (this.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  }

  getPasswordRequirements(): { met: boolean; text: string }[] {
    return [
      {
        met: this.password.length >= 6,
        text: 'At least 6 characters'
      },
      {
        met: this.password.length > 0 && /[a-zA-Z]/.test(this.password),
        text: 'Contains at least one letter'
      }
    ];
  }

  isPasswordValid(): boolean {
    if (!this.password || this.password.length === 0) return false;
    const requirements = this.getPasswordRequirements();
    return requirements.every(req => req.met);
  }

  getPasswordStrength(): PasswordStrength {
    if (!this.password) {
      return { score: 0, label: '', color: '' };
    }

    let score = 0;
    if (this.password.length >= 4) score++;
    if (this.password.length >= 8) score++;
    if (/[a-z]/.test(this.password) && /[A-Z]/.test(this.password)) score++;
    if (/\d/.test(this.password)) score++;
    if (/[^a-zA-Z0-9]/.test(this.password)) score++;

    if (score <= 2) {
      return { score, label: 'Weak', color: '#e74c3c' };
    } else if (score === 3) {
      return { score, label: 'Fair', color: '#f39c12' };
    } else if (score === 4) {
      return { score, label: 'Good', color: '#3498db' };
    } else {
      return { score, label: 'Strong', color: '#2ecc71' };
    }
  }

  isFormValid(): boolean {
    return !this.getUsernameError() && !this.getEmailError() && 
           !this.getPasswordError() && this.isPasswordValid();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    this.usernameTouched = true;
    this.emailTouched = true;
    this.passwordTouched = true;

    if (!this.isFormValid()) {
      this.showToastMessage('Please fill in all fields correctly', 'error');
      return;
    }

    this.isLoading = true;

    this.authService.register({
      username: this.username.trim(),
      email: this.email.trim(),
      password: this.password
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.token) {
          this.showToastMessage('Account created successfully! Redirecting to login...', 'success');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.showToastMessage(response.message || 'Registration failed', 'error');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.showToastMessage(
          error.error?.message || 'Registration failed. Please try again.',
          'error'
        );
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
