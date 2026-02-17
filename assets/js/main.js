let myKeyboard;
let isReadyForPassword = false;

window.show_prompt = function(text, type) {
    isReadyForPassword = true; 
    $('#error-message').text("");
};

window.show_message = function(text, type) {
    $('#error-message').text(text);
};

window.authentication_complete = function() {
    if (lightdm.is_authenticated) {
        $('#error-message').text("Giriş başarılı!").css('color', 'green');
        const session = $('#session-list').val() || lightdm.default_session;
        lightdm.start_session(session);
    } else {
        $('#error-message').text("Hatalı şifre! Lütfen tekrar deneyin.").css('color', 'red');
        $('#password').val("");
        if (myKeyboard) myKeyboard.clearInput();
        
        $('#password').addClass('shake');
        setTimeout(() => {
            $('#password').removeClass('shake');
        }, 500);
        isReadyForPassword = false;
        const selectedUser = $('#user-list').val();
        if (selectedUser) {
            lightdm.authenticate(selectedUser);
        }
    }
};

const updateBattery = (battery) => {
    const level = Math.floor(battery.level * 100);
    const charging = battery.charging;
    
    $('#battery-level').text(level + '%');
    
    if (level > 50) {
        $('#battery-level').css('color', '#00ff00'); 
    } else if (level > 20) {
        $('#battery-level').css('color', '#ffaa00'); 
    } else {
        $('#battery-level').css('color', '#ff0000'); 
    }
    
    if (charging) {
        $('#battery-icon').text('⚡').attr('title', 'Şarj oluyor');
    } else {
        const icons = {
            high: '🔋',
            medium: '🔋',
            low: '🪫',
            critical: '🪫'
        };
        
        let icon = level > 80 ? icons.high :
                   level > 50 ? icons.medium :
                   level > 20 ? icons.low : icons.critical;
        
        $('#battery-icon').text(icon).attr('title', `Batarya: ${level}%`);
    }
};

const showFakeBattery = () => {
    let fakeLevel = 75; 
    let fakeCharging = false;
    
    const updateFakeBattery = () => {
        $('#battery-level').text(fakeLevel + '%');
        
        if (fakeLevel > 50) {
            $('#battery-level').css('color', '#00ff00');
        } else if (fakeLevel > 20) {
            $('#battery-level').css('color', '#ffaa00');
        } else {
            $('#battery-level').css('color', '#ff0000');
        }
        
        if (fakeCharging) {
            $('#battery-icon').text('⚡').attr('title', 'Şarj oluyor (TEST)');
            fakeLevel = Math.min(100, fakeLevel + 1); 
        } else {
            const icons = {
                high: '🔋',
                medium: '🔋',
                low: '🪫',
                critical: '🪫'
            };
            
            let icon = fakeLevel > 80 ? icons.high :
                       fakeLevel > 50 ? icons.medium :
                       fakeLevel > 20 ? icons.low : icons.critical;
            
            $('#battery-icon').text(icon).attr('title', `Batarya: ${fakeLevel}% (TEST)`);
            fakeLevel = Math.max(0, fakeLevel - 1); 
        }
        
        if (fakeLevel <= 20) fakeCharging = true;
        if (fakeLevel >= 100) fakeCharging = false;
    };
    
    updateFakeBattery();
    setInterval(updateFakeBattery, 2000);
};

const initBattery = () => {
    if ('getBattery' in navigator) {
        navigator.getBattery().then((battery) => {
            updateBattery(battery);
            
            battery.addEventListener('levelchange', () => updateBattery(battery));
            battery.addEventListener('chargingchange', () => updateBattery(battery));
            
            setInterval(() => updateBattery(battery), 30000);
        }).catch((error) => {
            showFakeBattery();
        });
    } else {
        showFakeBattery();
    }
};

const updateUserAvatar = (userName) => {
    const user = lightdm.users.find(u => (u.username || u.name) === userName);
    const avatarElement = $('#user-avatar');
    
    if (user && user.image) {
        avatarElement.attr('src', user.image);
    } else {
        avatarElement.attr('src', 'logotype-pisi.svg'); // varsayılan logo
    }
};

$(document).ready(function() {
    if (lightdm.authentication_complete) {
        lightdm.authentication_complete.connect(authentication_complete);
    }
    if (lightdm.show_prompt) {
        lightdm.show_prompt.connect(show_prompt);
    }
    if (lightdm.show_message) {
        lightdm.show_message.connect(show_message);
    }

    const initLists = () => {
        if (lightdm.sessions && lightdm.sessions.length > 0) {
            const sessionOptions = lightdm.sessions.map(s => 
                `<option value="${s.key}">${s.name}</option>`
            ).join('');
            $('#session-list').html(sessionOptions);
            updateUserAvatar(userName);
        }
        
        if (lightdm.users && lightdm.users.length > 0) {
            const userOptions = lightdm.users.map((u) => {
                const userName = u.username || u.name;
                const displayName = u.display_name || userName;
                return `<option value="${userName}">${displayName}</option>`;
            }).join('');
            $('#user-list').html(userOptions);
            
            const firstUser = lightdm.users[0];
            const userName = firstUser.username || firstUser.name;
            $('#user-list').val(userName);
            
            lightdm.authenticate(userName);
            
            $('#password').focus();
        }
    };
    initLists();

    $('#user-list').on('change', function() {
        $('#password').val("");
        if (myKeyboard) myKeyboard.clearInput();
        $('#error-message').text("");
        
        isReadyForPassword = false;
        lightdm.cancel_authentication();
        lightdm.authenticate($(this).val());
        
        $('#password').focus();
        updateUserAvatar($(this).val());
    });

    $('#login-button').on('click', function() {
        const pass = $('#password').val();
        const selectedUser = $('#user-list').val();
        if (!pass) {
            $('#error-message').text("Şifre boş olamaz.").css('color', 'orange');
            return;
        }
        lightdm.respond(pass);
    });

    $('#password').on('keypress', function(e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            $('#login-button').trigger('click');
        }
    });

    const updateTime = () => {
        const now = new Date();
        $('#clock').text(now.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}));
        $('#date').text(now.toLocaleDateString('tr-TR'));
    };
    setInterval(updateTime, 1000); 
    updateTime();
    initBattery();

    if (window.SimpleKeyboard) {
        const Keyboard = window.SimpleKeyboard.default;
        myKeyboard = new Keyboard({
            onChange: input => { 
                $('#password').val(input); 
            },
            onKeyPress: button => { 
                if (button === "{enter}") {
                    $('#login-button').trigger('click');
                }
            },
            layout: {
                default: [
                    '1 2 3 4 5 6 7 8 9 0 {bksp}',
                    'q w e r t y u i o p',
                    'a s d f g h j k l {enter}',
                    'z x c v b n m',
                    '{space}'
                ]
            },
            display: {
                '{bksp}': '⌫',
                '{enter}': '↵',
                '{space}': ' '
            }
        });

        window.changeLanguage = function(lang) {
            const layout = lang === 'tr' ? 
                {
                    default: [
                        '1 2 3 4 5 6 7 8 9 0 {bksp}', 
                        'q w e r t y u ı o p ğ ü', 
                        'a s d f g h j k l ş i {enter}', 
                        'z x c v b n m ö ç', 
                        '{space}'
                    ]
                } : 
                {
                    default: [
                        '1 2 3 4 5 6 7 8 9 0 {bksp}',
                        'q w e r t y u i o p',
                        'a s d f g h j k l {enter}',
                        'z x c v b n m',
                        '{space}'
                    ]
                };
            
            myKeyboard.setOptions({
                layout: layout
            });

    if (lang === 'tr') {
        $('#login-button').text('Giriş Yap');
        $('#password').attr('placeholder', 'Şifre');
    } else {
        $('#login-button').text('Login');
        $('#password').attr('placeholder', 'Password');
    }
        };
    }
});

window.toggleKeyboard = function() {
    $('.simple-keyboard').toggle();
};