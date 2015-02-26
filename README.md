いいね！カウンター
====

某テレビ番組の「へ～」ボタンのような感覚で、「いいね！」ボタンを連打＆みんなで共有出来るツールです。  
LTやプレゼンなどを盛り上げるのに役立つかもしれません。

社内のちょいイベントで利用するために開発したツールでherokuの無料枠で稼働する前提で作られています。  
シングルインスタンスでのみ動作するので2xとかにすると正常に動きません。
その場限りのツールとして作っているのでさほど丁寧には作られていません。

起動してスマホのブラウザで開くと、接続している全員でいいね！の数を共有できます。

WebSocketを使っているのでAndroidは4.4以降の標準ブラウザかChromeをサポートしてます。  
iOSはわりと古いバージョンでも動作します。


## 使い方

herokuにそのままデプロイして利用します。
起動するドメインは``example.herokuapp.com``とします。

### メイン画面
https://example.herokuapp.com/

この画面をスマホで開いて、みんなでいいね！を押しまくります。

### モニター画面
https://example.herokuapp.com/monitor.html

プレゼン画面などの片隅に表示していいね！がカウントアップされる様子を表示できます。

### カウンターのリセット
https://example.herokuapp.com/admin.html

パスワードは``heroku config:set ADMIN_PW=1111``のように生パスワードを設定してください。  
クリティカルなツールではないためハッシュ化などはしていません、他で利用しているパスワードの流用は避けてください。

### データの保存
オンメモリで稼働するアプリなのでherokuでアプリケーションサーバが再起動されたらデータが初期化されてしまいます。
そこでPostgreSQLをherokuに紐付けておけばメモリ上のデータを5秒おきに自動保存して再起動時に前回のデータを引き継げます。

``heroku addons:add heroku-postgresql:hobby-dev``でアプリにDBを追加したら自動的に``DATABASE_URL``が設定されます。  
追加後に``heroku config:get DATABASE_URL``で正しく設定されている事を確認してください。

正しく追加できたら``heroku pg:psql``で接続して下記DDL/DMLを実行してください。
```
create table storage (
	key varchar(100) not null,
	value text,
	primary key (key)
);

insert into storage(key, value) values ('like_user', '{}');
```
