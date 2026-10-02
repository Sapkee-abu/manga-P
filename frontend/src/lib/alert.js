import Swal from 'sweetalert2';

/** SweetAlert ที่ตั้งสีให้เข้ากับธีม */
export const Alert = Swal.mixin({
  confirmButtonColor: '#0b6b5a',
  cancelButtonColor: '#6b665c',
  buttonsStyling: true,
});
