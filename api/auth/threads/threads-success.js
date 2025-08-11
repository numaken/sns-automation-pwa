// threads-success.jsx (または該当するコンポーネント)
const handleBackToApp = () => {
  // メインアプリにリダイレクトし、認証成功フラグを付与
  window.location.href = '/?auth_success=threads';
};