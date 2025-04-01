import { useMMKVStorage } from 'react-native-mmkv-storage';
import { storage } from '../../storage.ts';
import { BrowserAction } from './browser-actions.ts';

const DEFAULT_BROWSER_ACTIONS: BrowserAction[] = [
    {
        image: 'data:image/png;base64,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',
        url: 'https://google.com',
        label: 'Google',
    },
    {
        image: 'data:image/png;base64,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',
        url: 'https://www.duden.de/suchen/dudenonline',
        label: 'Duden',
    },
    {
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMQAAADECAMAAAD3eH5ZAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAF6UExURQ8rRpCdq5uls4KQn7a9x97g5+fp7uXo7dTZ4JumsrvCzObo7eDj6XuImePl69TY35qlssTK09jb49/i5+Tm6+Pk6t7h58PJ05Cdqr7EzoGPnq61wdnc46Wuu8rQ2M7S232Km6Wvu9HW3d3g5tre5MjN1rK6xOLl6t/i6KOsub3EzaGrt7zCzdvf5au0v7G5xKmzvtfb4djc4tXZ4Kavu93g552ntamxvtnd44uXp77FzqCrt8fM1S1AWc/U3Nve5cnO14GPn8LH0drd5dba4b3DzeTn7OLj6tzf5drd5OHk6dLW3tXZ4bvBzMvQ2bi+yczR2XeFl7nAy7zDzcXL1IyYp56ntbK6xb3EzsHH0MvP2MnO1rW8x4+bqTFEXMfN1ZWfrszQ2dDU3Li/yqiwvcjM1Zahr77Fz7G4xMbM1Nnb4zRFXq63wtDU3d7g5tPW3sDH0MHH0dXY4MPJ0pijsbnAys7T287T2qStuqCqt6SuutTX37a9yNPX32BnPbAAAAABYktHRACIBR1IAAAACXBIWXMAAF58AABefAEAx3y0AAAAB3RJTUUH6QMdBis1PAJQgAAAAC90RVh0Q29tbWVudABQTkcgY3JvcHBlZCB3aXRoIGh0dHBzOi8vZXpnaWYuY29tL2Nyb3C32HO0AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI1LTAzLTI5VDA2OjQzOjIwKzAwOjAwVCqZowAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNS0wMy0yOVQwNjo0MzoyMCswMDowMCV3IR8AAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjUtMDMtMjlUMDY6NDM6NTMrMDA6MDBJTxNEAAAAEnRFWHRTb2Z0d2FyZQBlemdpZi5jb22gw7NYAAAFw0lEQVR42u2c+VsTRxiAhwQmIRsCkRi0Ag0JCYEQqYoUmlJDS+MBmqBorShira29W3vb9n9vrp29Zmav7Mzu83zvb7uzy34vu9n55lqEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvDEWi8sOwS/jExgnkpOyw/BFSsE90lG2mMrgAdOOT5nJnpvNKcr5fHLuguzwB1wcOuDEO85OuDSvYEIiuSBboMciCSjm5PDJJDaivFuQbLBULGVIOOnlsm08lRVsoboq1WEtYY6nxj9hPYEp5C5JdFiyhlTnnpCiOnQtLsuTKFLi2fDg0L2DU9IkSpRwyl4cMC5GRILngJX3ZEnQHqeKQ4fZK1er+u1rsiQ2rf/b684crm319r2/rbsVO7IsPrC8YhtOHJQPh3t3P9J2ZmVJoE1DZXejuefI4WOt4BOyd1+aBHKWdjAd0IJ2E2VKfKpG0WImgGwHhPLq/oRMiambwyiYqTjPAe2TkoJMi/Vho4j1euE6oGlSJLdpsXFLwa1pbw7oNimS6oC4HQU2Djuk+I6IQNev5B20F1w6oANSuB28wu7h4D1Yc3easZ621md3tZbqveAlmsNL1V2dZcqXbpsT7raufDN4CdKq3HBxkiVvNVnoHa67+LseaZCLlZ2fRMm9DRZ6B9wOXmKVXKzjx6H7OB6R8vv68vngHbxIMNpA5F480JfntkIpwWzHDS0MDkpKgIN7CWP9kLZYGBzwsQgH1xJGh+MxQ2u8+7u4b1N/jJjaao82uWCxv20zHmGppx/mDfdiTaTDbpPS69iHOx5ByTWMFligAzrEbNjjEdR8iWkRtMM65sFqBDFyPoZF4L+Hfa4EYzyCmbdSLYLv48hzJfAjVw5UCwH9NMtcB2XMnQPFQkRfU5MrQcvKbdpAD6vCHVChynFQPnPtYKqnBfX5NepMhwwldw6lQ5dKudND6/9e7m8vPi5Ex0HFSe5kypcs5YLzJU8SoXdwIBF+B3uJCDjYSkTBAcVIAIv2DuF7Lw2IkyjWIuuAkDqtJFOIrgOaHLT1lQjV0zSL6QRW6lHJl5jEY7SxnGg50InEuxUcwAEcwAEcwAEcqLlG28YhDOstfDqMl0Kw3sKnQyjWW/h0OHK/3iJ0DuhztcjpeosQOui62h2ttwjewcu79QkplbVsYgT1g3SJUdRxsiVGUk9LlhhNriFXwud7aeriYn98hswhxcX+9ombuWySHVIZzKLucnakNIdxBbOp7jkKQbYDmsA8mkIcnvp0eMZ1wMsiHBZy/hzQFl8iL8DhtOTTQTe+QUXEKpasXwdtfIOOgEmx8RXfDur4Bp2D4B20FdfeHRCaSbKeqJXnAhzQ1RE4oN74Rn8OpDbDot3fPhOhgOItctkXlkL3fTNycidtOumdU/8OkiS+IFftmIteeugjkyOhvVe+NJV46ueTIqGtSVwZhYMciVfkoofGAi/PUpcTcspX4iS0KZlfj8IBvSavCXEOF0isCcOCIK8OCKnzCr8RJ0HWxxrzZe8OqDaY4yki11DRMjf9kqisn/GHvea3+X0BOZ+Glvwtqbtq5VnMdziqfScyRju+J6Gm+9un4z/8iDHfoVJXcOsnad8csNIhsRYR2pk7dx5jO4cHgz6BangstDZds1Oi9VhY+5fUReaHXq4XBJO8nhb678HBcn/BpPgKSjjHH0y84jokfjYfHzu4pfX0TWw/F9QrxucezyFtmUx31/IxkjPZBl1+YSvkOgXz0W4+CyOQGUbrXqlnn1mPdvWBHoG8od2DN7/S6wCX33sSxm/mJY/p4u+nrIPDKoEqunGF1ny2wTuW9ji9li3Q52z47cF08aVd7eX6Q24CaRz/8efcX06OfGx5xf4tO3gPvP3H8HHDk4LsgDwSvrTDA2GYgOIbMhUoKTsSPwy/T5OekR2IL/7tTY/7L9oOXXbehiIHBwAAAAAAAAAAAAAAAAAAAAAgHPwPo3b1jtdD+yYAAAAASUVORK5CYII=',
        url: 'https://www.deepl.com/de/write#de',
        label: 'DeepL Write',
    },
    {
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMQAAADEAgMAAAC9yGb4AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAJUExURQ8rRv////9VVU3tSmQAAAABYktHRAJmC3xkAAAACXBIWXMAAE69AABOvQFzamgUAAAAB3RJTUUH6QMdBiw3nU2nawAAAelJREFUaN7tmEtuwzAMRK2FblDeR72BFub9r1LH8kei23LGQYq24GwSIHwxOaQ+yTSFQqFQKBT6f0paSEJ0JglVZZNSMq2fIPg6bhBZK0mEXiM1Kh6QLeGuE7GEOy1XwktLaYJ/Bl9HpolkgeoR5nlM+HRvm+MJqojVhMIR+Q4Bx7avJqzK81Y4TIhuRMWJQlrVvpyxqpUshFUtlpmRNZ/EzMgazHX8kRBTRiuEG/Ulo3du1BO2446FsIetIFu0LYRcsb/zlsFnxVfOuzt2MPuwmRLxXTCTKL4LZtoB38yK8n0zqxZY8WZnSL7TZvfJPqHjDpfdIUtmFxWX2EKPQsQdyz2dPX1/l9gjT9Kx98jmzM4nSv9meXFOxHQ404jlUdlpyPFxm/Il3Dunj6SzNm5ODpF3K1NtRCXvGw+jWKJwt6A1IyEJ8ja3Ous1xBAzecdcE/IaYohKXgCbsRxRJuquteVDNGSrmbkz6j7yBAH+qtglTxAFJIifkheiYkB6hgDtzTeI89jBiGM64BUi3WFYIOK0CCfKhf1WXS7gCunqBVdI5ym4QrowsCFdKmBDunLBhvSWokT5lP5SQyZQQ4ZqoYYMjkINGYJ4AmrI8K9iwp7R24MQ4z/JUn1ieht4AAiFQqFQKPR39AEij+liLGRoyQAAADd0RVh0Q29tbWVudABQTkcgY29udmVydGVkIHdpdGggaHR0cHM6Ly9lemdpZi5jb20vc3ZnLXRvLXBuZy84qKEAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjUtMDMtMjlUMDY6NDQ6NDMrMDA6MDBBcZHAAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI1LTAzLTI5VDA2OjQ0OjQzKzAwOjAwMCwpfAAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNS0wMy0yOVQwNjo0NDo1NSswMDowMMhDPQcAAAASdEVYdFNvZnR3YXJlAGV6Z2lmLmNvbaDDs1gAAAAASUVORK5CYII=',
        url: 'https://www.deepl.com/de/translate#de',
        label: 'DeepL Translate',
    },
];

export function useBrowserActions() {
    const [actions, setActions] = useMMKVStorage<BrowserAction[]>(
        'browser-actions',
        storage,
        DEFAULT_BROWSER_ACTIONS,
    );

    return { actions, setActions };
}
