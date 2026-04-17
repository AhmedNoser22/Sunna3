import { HttpInterceptorFn } from '@angular/common/http';

export const auth: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  
  // ✅ السطر ده عشانك أنت.. افتح الـ Console في المتصفح وشوف طبع إيه
  console.log('Interceptor checking token:', token ? 'Found ✅' : 'Not Found ❌');

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};