// JS riêng của Settings: đổi ngôn ngữ, sub-tabs, toast (tách nguyên văn từ code gốc)
document.addEventListener('DOMContentLoaded', () => {
            const languageSelect = document.getElementById('languageSelect');
            let currentLang = localStorage.getItem('lang') || 'en';

            // Hàm chuyển đổi ngôn ngữ giao diện
            const setLanguage = (lang) => {
                currentLang = lang;
                localStorage.setItem('lang', lang);
                languageSelect.value = lang;

                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (translations[lang] && translations[lang][key]) {
                        el.innerText = translations[lang][key];
                    }
                });
            };

            // Lắng nghe sự kiện thay đổi trên Dropdown Language
            languageSelect.addEventListener('change', (e) => {
                setLanguage(e.target.value);
                showToast('toast_saved');
            });

            // Khởi chạy ngôn ngữ mặc định
            setLanguage(currentLang);

            // Chuyển Settings Sub-Tabs
            const settingTabs = document.querySelectorAll('.setting-tab-btn');
            const settingContents = document.querySelectorAll('.setting-tab-content');

            settingTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    settingTabs.forEach(t => {
                        t.className = "setting-tab-btn px-5 py-2.5 rounded-full text-xs font-bold transition-all text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800";
                    });

                    tab.className = "setting-tab-btn px-5 py-2.5 rounded-full text-xs font-bold transition-all bg-orange-500 text-white shadow-sm";

                    settingContents.forEach(content => content.classList.add('hidden'));

                    const targetTabId = tab.getAttribute('data-tab');
                    const targetTabContent = document.getElementById(targetTabId);
                    if (targetTabContent) {
                        targetTabContent.classList.remove('hidden');
                    }
                });
            });

            // Toast notification
            window.showToast = (msgKey) => {
                const toast = document.getElementById('toast');
                const toastMsg = document.getElementById('toast-msg');
                toastMsg.innerText = translations[currentLang][msgKey] || translations[currentLang]['toast_saved'];
                
                toast.classList.remove('-translate-y-20', 'opacity-0');
                toast.classList.add('translate-y-0', 'opacity-100');

                setTimeout(() => {
                    toast.classList.remove('translate-y-0', 'opacity-100');
                    toast.classList.add('-translate-y-20', 'opacity-0');
                }, 2500);
            };
        });
