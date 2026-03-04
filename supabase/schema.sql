create table memos (
  id              text primary key,
  user_id         uuid references auth.users not null,
  idea            text not null default '',
  trigger         text not null default '',
  details         text not null default '',
  action_items    text[] not null default '{}',
  status          text not null default '未着手',
  edit_stage      text not null default 'rough',
  tag_ids         text[] not null default '{}',
  freshness_score float not null default 100,
  created_at      timestamptz not null,
  updated_at      timestamptz not null
);

create table tags (
  id              text primary key,
  user_id         uuid references auth.users not null,
  text            text not null,
  normalized_text text not null,
  created_at      timestamptz not null
);

create table relations (
  id             text primary key,
  user_id        uuid references auth.users not null,
  from_memo_id   text not null,
  to_memo_id     text not null,
  type           text not null default 'keyword_overlap',
  strength       float not null default 0,
  shared_tag_ids text[] not null default '{}',
  created_at     timestamptz not null
);

alter table memos     enable row level security;
alter table tags      enable row level security;
alter table relations enable row level security;

create policy "own memos"     on memos     for all using (auth.uid() = user_id);
create policy "own tags"      on tags      for all using (auth.uid() = user_id);
create policy "own relations" on relations for all using (auth.uid() = user_id);
