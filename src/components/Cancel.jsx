// src/components/Cancel.jsx - 決済キャンセルページ
import React from 'react';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

const Cancel = () => {
    const goToApp = () => {
        window.location.href = '/';
    };

    const retryPayment = () => {
        // アプリに戻ってアップグレードを再試行
        window.location.href = '/?retry=payment';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
                <div className="text-center">
                    {/* キャンセルアイコン */}
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-8 h-8 text-orange-600" />
                    </div>

                    {/* メインメッセージ */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        決済がキャンセルされました
                    </h1>
                    <p className="text-gray-600 mb-6">
                        プレミアムプランへのアップグレードは完了していません
                    </p>

                    {/* キャンセル理由・説明 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-800 mb-2">
                            <strong>💡 プレミアムプランでできること</strong>
                        </p>
                        <ul className="text-sm text-blue-700 text-left space-y-1">
                            <li>✅ 無制限の投稿生成</li>
                            <li>✅ 直接SNS投稿機能</li>
                            <li>✅ より高品質なAI生成</li>
                            <li>✅ 広告なしのクリーンUI</li>
                            <li>✅ 優先サポート</li>
                        </ul>
                    </div>

                    {/* 現在の制限情報 */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-yellow-800">
                            <strong>現在の無料プラン制限</strong>
                        </p>
                        <ul className="text-sm text-yellow-700 text-left space-y-1 mt-2">
                            <li>• 1日3回まで投稿生成</li>
                            <li>• SNS投稿機能なし</li>
                            <li>• 基本品質AI生成</li>
                        </ul>
                    </div>

                    {/* アクションボタン */}
                    <div className="space-y-3">
                        <button
                            onClick={retryPayment}
                            className="w-full py-3 px-6 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>もう一度アップグレードする</span>
                        </button>

                        <button
                            onClick={goToApp}
                            className="w-full py-3 px-6 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>無料プランで続ける</span>
                        </button>
                    </div>

                    {/* 追加情報 */}
                    <div className="mt-6 text-xs text-gray-500">
                        <p>カード情報は保存されておらず、安全です</p>
                        <p>いつでもアップグレードできます</p>
                    </div>

                    {/* お得情報 */}
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                            <strong>🎯 特別オファー:</strong> 月額¥980で全機能が無制限！
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cancel;