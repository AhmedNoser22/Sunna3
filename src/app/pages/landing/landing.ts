import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { VendorApplyModal } from '../../shared/vendor-apply-modal/vendor-apply-modal';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, CommonModule, VendorApplyModal],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  showVendorModal = signal(false);

  features = [
    { icon: '📋', title: 'تنظيم الطلبات', desc: 'تصنيف وترتيب طلبات الصيانة حسب النوع والأولوية تلقائياً' },
    { icon: '📍', title: 'متابعة لحظية', desc: 'تابع الفني من لحظة الاستلام حتى الإنهاء مع تنبيهات فورية' },
    { icon: '💰', title: 'ضبط التكاليف', desc: 'كل تكلفة واضحة ومعتمدة — مفيش مصروف بدون موافقة' },
    { icon: '📸', title: 'توثيق كامل', desc: 'صور وأوقات وخطوات موثقة — كل طلب يصبح سجل رسمي' },
    { icon: '✅', title: 'اعتمد الأصول', desc: 'موافقة رسمية في كل خطوة — مفيش شغل خارج السيستم' },
    { icon: '⭐', title: 'تقييم الأداء', desc: 'قيّم الفنيين وشركات الصيانة بعد كل طلب لضمان الجودة' },
  ];
  services = [
    {
      title: 'خدمات السباكة',
      desc: 'إصلاح تسريبات، تركيب خلاطات، وصيانة كاملة للسباكة المنزلية.',
      image: 'https://images.pexels.com/photos/4239128/pexels-photo-4239128.jpeg' // فني سباكة شغال بالعدّة
    },
    {
      title: 'الأعمال الكهربائية',
      desc: 'تركيب وصيانة الكهرباء، حل الأعطال بسرعة وأمان.',
      image: 'https://images.pexels.com/photos/9679179/pexels-photo-9679179.jpeg' // فني كهرباء وشغل أسلاك
    },
    {
      title: 'صيانة التكييف',
      desc: 'تنظيف، شحن فريون، وصيانة جميع أنواع التكييفات.',
      image: 'https://plus.unsplash.com/premium_photo-1683134512538-7b390d0adc9e?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' // صيانة تكييف داخلي
    },
    {
      title: 'صيانة الأجهزة',
      desc: 'إصلاح الغسالات، الثلاجات، والبوتاجازات بأعلى جودة.',
      image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg' // تصليح أجهزة منزلية
    },
    {
      title: 'أعمال النجارة',
      desc: 'تصليح الأبواب، الأثاث، وكل أعمال الخشب.',
      image: 'https://tse1.mm.bing.net/th/id/OIP.5AFiMZPKwBBpTZ9HRAmxXAHaE8?rs=1&pid=ImgDetMain&o=7&rm=3' // نجار في الورشة
    },
    {
      title: 'تشطيبات عامة',
      desc: 'دهانات، تشطيبات، وتجديد الشقق بأفضل الأسعار.',
      image: 'https://images.pexels.com/photos/6474471/pexels-photo-6474471.jpeg' // أعمال دهانات ونقاشة
    }
  ];

  stats = [
    { value: '4.9', label: 'تقييم متوسط' },
    { value: '45', label: 'شركة عقارات' },
    { value: '98%', label: 'رضا العملاء' },
    { value: '+1,240', label: 'طلب منجز' },
  ];

  tickets = [
    { icon: '⚡', title: 'عطل كهربائي', loc: 'وحدة 4B', status: 'جارٍ', color: '#f59e0b' },
    { icon: '🚿', title: 'تسريب مياه', loc: 'حمام — الدور 3', status: 'جديد', color: '#3b82f6' },
    { icon: '❄️', title: 'صيانة تكييف', loc: 'طابق 7', status: 'منتهي', color: '#10b981' },
  ];
}