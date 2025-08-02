// src/components/UpgradeButton.jsx (新規作成)
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const { clientSecret, subscriptionId, customerId } = data;


const UpgradeButton = ({ onUpgradeSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // サブスクリプション作成
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      console.log('Stripe response:', data); // ✅ ← ここでログ出力

      const { clientSecret, subscriptionId, customerId } = data;

      if (!response.ok) {
        throw new Error('サブスクリプション作成に失敗しました');
      }

      // Stripe決済画面にリダイレクト
      const stripe = await stripePromise;

      if (!clientSecret) {
        console.error('clientSecret is missing!', data);
        setError('clientSecret が取得できませんでした（バックエンドエラー）');
        return;
      }


      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret);

      if (stripeError) {
        setError('決済に失敗しました: ' + stripeError.message);
      } else {
        // 成功時の処理
        localStorage.setItem('userEmail', email);
        onUpgradeSuccess('premium');
        alert('プレミアムプランにアップグレードしました！');
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="upgrade-section">
      <div className="email-input">
        <input
          type="email"
          placeholder="メールアドレスを入力"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg mb-3"
        />
      </div>

      {error && (
        <div className="error-message text-red-600 mb-3">
          {error}
        </div>
      )}

      <button
        onClick={handleUpgrade}
        disabled={isLoading}
        className="w-full py-3 px-6 bg-orange-500 text-white font-medium rounded-lg 
                   hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isLoading ? '処理中...' : '月額¥980でアップグレード →'}
      </button>
    </div>
  );
};

export default UpgradeButton;