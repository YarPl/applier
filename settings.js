module.exports.operatingMode = 2;

/*

         1 -- запуск драйвера через системную переменную в PATH
         driver = new webdriver.Builder().forBrowser('chrome').build(); 
         -----
         2 -- запуск драйвера программными средствами
         driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build();      
         -----
         3 -- запуск драйвера программными средствами в режиме headless
         driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).setChromeOptions(new chrome.Options().headless()).build();

*/


module.exports.chronos = {
    
    time_out                : 60  * 1000,
    restart_delay           : 30  * 1000,
    restart_attempts        : 10,     
    think_time              : 3   * 1000,
    conditional_expectation : 20  * 1000,
    chunking_oscillation    : 10  * 1000,
    chunking_max_limitation : 6000

};



/*

        time_out                --  неявное (косвенное, скрытое) ожидание появления элементов веб-страницы                                           (in milliseconds)
        -----
        restart_delay           --  временная задержка между сбоем выполнения и попыткой перезапуска                                                 (in milliseconds)      
        -----
        restart_attempts        --  количество попыток перезапуска в одном системном состоянии                                                       (к-во.)
        -----
        think_time              --  статистическое распределение временных задержек между определенными действиями или время ожидания (Think Time)   (in milliseconds)
        -----
        conditional_expectation --  увеличенное время ожидания (Think Time) для частных случаев                                                      (in milliseconds)
        -----
        chunking_oscillation    --  период между запусками функции, создающей фрагменты данных                                                       (in milliseconds)
        -----
        chunking_max_limitation --  максимально допустимое количество записей во фрагменте                                                           (к-во.)
         
         
*/


module.exports.directory_tree = {
    
    input_path       : __dirname + '/input/',
    output_path      : __dirname + '/output/',
    


    get attachments_path(){
        return this.input_path + 'attachments/';
    },



    get raw_data_path(){
        return this.input_path + 'raw_data/';
    },

    get verified_data_path(){
        return this.raw_data_path + 'verified_data/';
    },



    get storage_path(){
        return this.input_path + 'storage/';
    },

    get enrichment_path(){
        return this.storage_path + 'enrichment/';
    },

    get vault_path(){
        return this.input_path + 'vault/';
    },



    get ready_path(){
        return this.output_path + 'ready/';
    },

    get suspended_path(){
        return this.output_path + 'suspended/';
    },

    get sent_path(){
        return this.output_path + 'sent/';
    },



    get captcha_path(){
        return this.input_path + 'captcha/';
    },

};


module.exports.file_structure = {
    
    PoA_SVEA       : 'PoA_SVEA.pdf',
    enquiry_SVEA   : 'enquiry_SVEA.txt',
    
    PoA_RSC        : 'PoA_RSC.pdf',
    enquiry_RSC    : 'enquiry_RSC.txt',

};


module.exports.grantors = ["SVEA", "RSC"];


module.exports.tesseract_lang = "captcha";


module.exports.sender_config = {
    
    method: 'post',
    //url: 'http://procollect-02.beta.creditexpress.ru/api/admin/import-gov-services',
    url: 'https://procollect-rsv-01.rsvcollection.ru/api/admin/import-gov-services',
    headers: {  
      'authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIyIiwianRpIjoiMTgzODc4YThmMjdhYzY5MGZjZjZhYTUwZGVmNmFjOTUxZDk0ZjViYWY1MGVjZWVjMDk5OGJhNjMxYTg4MmY2MTRiOWYyMjc4M2QzZjdmNGIiLCJpYXQiOjE2MzQ5ODkwNDEuNjcsIm5iZiI6MTYzNDk4OTA0MS42NywiZXhwIjoxNjM1MDM5NDQxLjYzNjgsInN1YiI6IjExNTI0Iiwic2NvcGVzIjpbXX0.NaNdMJre8cj3LDVAFNIzkhvPCFBhBo22KD4VMjal_o-knIKhcwWSVEAPBHcXXk9iMFufviKrhzNa2CFc5pYmJu88A_L0ZR5I7bmDicWIWr-mCao6D6RULdk1O-nYq0EHlyLYTIksoTXt0lDzv31Lgim96xOdWBKTkW3E4_UCxTPPJkYHn4KTc_UCV6Ez_KNlsUHk3K31rhcluAF-jv9ufhw21xvEThaYsSrMMtrFn1dSMRgMapsDPIgP31H4NG_3Lc_vO24F9xlNJs1Rs2q4ev2oTtxcZKt3nFRxb3UJmwSmypPC-TplJfAifeonhOcwV5KqN0dCM7oYRWHPkHnubLwHnZHEXrlOAhH1JGGr38qCnEQosmGbL5QGoNDAKbWQSFUjkO4HnRq91Zo7bIGC_OqvsqyOX4B3Y6daTxqiXevc1bLRd5S5bGvMyo-xfZxCyzJq_MjVJoW6uvFV-9HcTsu4PBCYsxIZlhfUh4MYTtMtkXiY5BaefOSN73rvhL0577Ot5NfoR5upNlz9deD_VtGJEVqy8GMPFVLQIRZHFt4NX3T6S2MeAqGSMZaStW5Hw2fgNFNyARs0f4MAXaFnMVx0ssNPwYbI0pV9RA2cV1mZ4MXRkOxCRJ9ryL29ARE42Gb5PZW97G53rexw3xrR5DtYjXYGCkgmj9AkJuKHlRM', 
      'cookie': 'VouchCookie=H4sIAAAAAAAA_6SW3XKzvBWFr6gdBMatDz_HiJ9YchDSFuhMSLzBILASkxj76jvO-830Z9qjnjOz2VprPWt396JvU3M-nYtcPHJEz_k1n1lsXvJtPvoaXordX7t7gUwI93bCi6rybT673ky7R5vi8Djvr1riR5nSu5LM2xQ2JiuciciXlcn5-FI8dM2cuedbeS_uJlJDG65XJWmg5e7rOBcod8E1HykyEftuBb020i3P77t7MZtph0xGzid3PTO0e1OT8k0oHnSAX2UNgU7hy6ZuaGrm1Ethf1W3s0jw0ITwMIh96xC-8uFyVrV7NROuhXRvWrgtIEapCO6c7yk4H_MBSzHltxPsFUn8TQC5dZIlzO0FpP0r1OOqMWQ6KxwkPhJTfNG4uIpRFbq2XoLdtKP7aEMHbYJi7pjSUrHjBHE1FFomzvPQYxO4xRz2vQjGsJJLCmK9GlywFsQKyEqOaXYSftQTW4XrKynpwh0d2AM4xxAwDJnJnILo_QEcp11aSJgVbXEBcNiDFuuhmvcDCZDnoXttQ5aL2Q7dtAv5oRgJuKaaFtKKOJbOViZlGQxsqBJ_bR6UWhjvp5oRMriLwn3VBsif5KIB-YvCdkMS523olMTqs5L-W4Nrynn_pnkfytHKFlwDMx3LwD0qia46ZYeKKwrYbfnIPmmyE2XtTmVkvXT9xQbuo436kx6DG0fssxPxR8X3pAz8RwOWabHzVW3PZBQrd-xi0kKUztZs6mMI1EuX0g8xsJMWz3mxNNg_5xV6xJHCTJoJFiJ3I6RMClA3wCBgZKcqNfdKukhLcuezLfS8P1cSSYtd3Wb0R9Mm6F-t80ubUS1-9glii3xN670uAz_yhL52E6urH09dkIT-1U7k3qX9qDlEzWivOiW3cvJDC-qzgb5qU8jL2WmZxFuexlIn7ou8xKpxqlbRe0C4Cko0hiWovRbrd5X1WIyOlLwI6FB8V5y-tlMvlWwWMe1AzfazysqNGrCEUBGe-hs4F7U1zUVWolNtT-0Ub-oILzrcFWreiy4rfpGh_-By-SwH11ezPR3BMzktJ5Fcl8bhwjgXqZHyKu1z7azvarsRYulVsowmWRoxwV089i8GX-4w97JKdrScXEBcn-rMb-mABwOsEhHzraALn9xH87ClTugvdaBOcBfSurhXwn_Ig3uj2bi00R9xl-6oCq07Sqc7wYg5YN9hFRrcZ6dkx_TBphqNjzoodDvtYjouUGX00bq9IIjNEJYbCJuIBCJmgf0oI7gpYYLq0L-xqLhVSImTVIeO02OF1AJhnD81a6RZuFMZO_TCCPWlD0Wvk7VnAbq08yVupiBqUP9mAhWTaX1RQRC3EmPC3ZXO-_oo12Mbmifvykoy0YaLa8_5Nn_mfy56QPiZx6JzVnAOlDz9Dkp3YrOCK87k4ErJ968GY04yN7JElYDZpXIQE9kDC_u7AvZqUfGl075qcZH--Bdc3aVxoaedB7nSTsRCSjeJKnad8FuFbfFnhmiFxdpwerMpzoFTCUL1wDEmgLf_zFCAdFrU8ONpr__N06Jgvz1N46qmRQsqkGCvJvjhnoNAxc1ATwa5RtYwsKi_SehPJYyPalo1C2-3n8yHdIHZDx0XqwRamMB9yWkdtBhDDjTSEjd89j87NaKvSEpzzhXpuPtS2KYd-AOV_ytT6GSngp9qpSRubo1ghXU-gwk9mfVQyc-8hQ1Ylz8M9i_WOQEcv7FwDbhQWoLNK-egSlTMx34m4w_zegia25N5XRJ_cL5_g9QgLlhBkvVQTaurEvzDeDKireDwBsl459Kz_2D-lYn1yuaeajQGCtsLn9iHzvYn_XhfhTOxwX4LtQc27QLh-leY2KeNLCVZGQoEugOWyrkAmHosoKc_zJ_68--OWR9a0lylS9Ee9r8ZHNI_mViEElhFJ_ahsv1ZT3YDYay5zO_2AP_CRJo_9WpBxU2IpEbvD5i9lolHEszaJv-33s_3H1nYTyqxV4s9_y8dQX_3al-pCWds9v1vvRapQ0irAbtW2rgZ7c1OONVprIlcN4BsKoHlTeieHfLVhEFMJM25dG9tRr0Yklhgv8h5r4iDLZ-8VA43MOx7hhR6_o92rhHT-sN45ZKvZlYXMdijxia2rv9o5HqW6QI2ZBue-BgebobEzZC61bgdq2brzAwO-P5TQRLxga7VaH91tR-a2WbVwbomWA5CWi8zFdm5YDpZJh46SRCOgQMFwA8mfaID9nbC74EIQDK0P1O50gYxdqrhtU0IIiHamBQvdAQuMia0oAUb7WsVXm4M49IcWGnrflsBncyh_yQO3xu3P0tHNoDxC5PXUNZFchRuq6YY9KS-TRDXItrfqtqtR_DejBQJ7I4wlfcWwVnW3rNwdz8K_GVmpY-C3YzsEQmKjUFNbMLNBlIELfgLl0vB0O6XTgut076pgoWx4Q9UyX4gs93aESXceYDRTya0TvD-YtId6Jpd27DPT2JcSsmuVUZuzVSMJfz9Dg-s6YjvNARkXHJT0y4zsP-0YiE83ZE29ReeKqYiICV40YKITzVj-fl2VnV_y4fLSgeCyIHcyZAHx5fCm4g8j2DZRjDo59F7oec2ii6d_Zv-nk7olU6f1w7HQ7z94_z9vm_z8D0J3v7S1fXmHwEAAP__gb6xgEULAAA=', 
      //...data.getHeaders()
    },
    //data : data

};