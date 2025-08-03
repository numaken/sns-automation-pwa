// src/components/Success.jsx - 決済成功ページ
import React, { useState, useEffect } from 'react';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';

const Success = () => {
    const [sessionData, setSessionData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                // URLからsession_idを取得
                const urlParams = new URLSearchParams(window.location.search);
                const sessionId = urlParams.get('session_id');

                if (!sessionId) {
                    throw new Error('セッションIDが見つかりません');
                }

                console.log('🔍 Verifying payment session:', sessionId);

                // セッション情報を取得
                const response = await fetch(`/api/verify-session?session_id=${sessionId}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || '決済確認に失敗しました');
                }

                setSessionData(data);

                // 決済成功時にプレミアムプランに更新
                if (data.payment_status === 'paid') {
                    // ローカルストレージ更新
                    localStorage.setItem('userPlan', 'premium');
                    localStorage.setItem('subscriptionId', data.subscription_id);
                    localStorage.setItem('customerId', data.customer_id);

                    // App.jsに通知
                    window.dispatchEvent(new CustomEvent('planUpdate', {
                        detail: { plan: 'premium' }
                    }));

                    console.log('✅ Payment verified and plan updated:', {
                        plan: 'premium',
                        subscriptionId: data.subscription_id,
                        customerId: data.customer_id
                    });
                }

            } catch (error) {
                console.error('🔥 Payment verification error:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        verifyPayment();
    }, []);

    const goToApp = () => {
        window.location.href = '/';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">決済を確認中...</h2>
                        <p className="text-gray-600">しばらくお待ちください</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-red-600 text-2xl">⚠️</span>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">確認エラー</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={goToApp}
                            className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            アプリに戻る
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
                <div className="text-center">
                    {/* 成功アイコン */}
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>

                    {/* メインメッセージ */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        🎉 決済完了！
                    </h1>
                    <p className="text-lg text-green-600 font-semibold mb-6">
                        プレミアムプランへようこそ！
                    </p>

                    {/* プレミアム特典 */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-center mb-2">
                            <Sparkles className="w-5 h-5 text-yellow-600 mr-2" />
                            <span className="font-semibold text-yellow-800">プレミアム特典が解放されました</span>
                        </div>
                        <ul className="text-sm text-yellow-700 text-left space-y-1">
                            <li>✅ 無制限の投稿生成</li>
                            <li>✅ 直接SNS投稿機能</li>
                            <li>✅ 高品質AI生成</li>
                            <li>✅ 広告なしUI</li>
                            <li>✅ 優先サポート</li>
                        </ul>
                    </div>

                    {/* 決済情報 */}
                    {sessionData && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
                            <p className="text-gray-600">
                                <strong>決済ID:</strong> {sessionData.payment_intent_id}
                            </p>
                            <p className="text-gray-600">
                                <strong>プラン:</strong> プレミアム (¥980/月)
                            </p>
                            <p className="text-gray-600">
                                <strong>次回請求:</strong> {new Date(sessionData.next_billing_date).toLocaleDateString('ja-JP')}
                            </p>
                        </div>
                    )}

                    {/* アクションボタン */}
                    <button
                        onClick={goToApp}
                        className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                        <span>アプリを使い始める</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* 追加情報 */}
                    <div className="mt-6 text-xs text-gray-500">
                        <p>決済の詳細はメールでも送信されます</p>
                        <p>サブスクリプション管理は設定画面から可能です</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Success;