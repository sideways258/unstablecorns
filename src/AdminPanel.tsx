import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Screen, Panel, PanelTitle, PanelSubtitle, Field, Select, Button, Label } from './ui/themed';
import { COLORS } from './theme';
import ImageLoader from './assets/card/imageLoader';
import {
  adminApi,
  clearToken,
  getToken,
  setToken,
  isAuthError,
  readFileAsDataUrl,
  CARD_TYPE_LABELS,
  AbilityCatalog,
  AbilitySpec,
  BaseCard,
  EffectOption,
  StoredPack,
} from './adminApi';

// "Card_Art-Name.png" -> "Card Art Name", for prefilling / matching.
const titleFromFilename = (name: string) =>
  name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

// like normalizeName but first drops an image extension, so "foo-bar.png" and
// "Foo Bar" collapse to the same key.
const imageKey = (s: string) =>
  normalizeName(String(s || '').replace(/\.(png|jpe?g|webp|gif)$/i, ''));

const buildBaseCardIndex = (cards: BaseCard[]) => {
  const idx: Record<string, BaseCard> = {};
  cards.forEach((c) => {
    idx[normalizeName(c.title)] = c;
  });
  return idx;
};

const matchBaseCard = (
  name: string,
  index: Record<string, BaseCard>
): BaseCard | undefined => index[normalizeName(name)];

// Minimal CSV parser: handles quoted fields, escaped quotes, CRLF.
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
};

type View = 'loading' | 'login' | 'change-password' | 'dashboard';

const AdminPanel = () => {
  const [view, setView] = useState<View>(getToken() ? 'loading' : 'login');
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const [packs, setPacks] = useState<StoredPack[]>([]);
  const [effects, setEffects] = useState<EffectOption[]>([]);
  const [cardTypes, setCardTypes] = useState<string[]>([]);
  const [baseCards, setBaseCards] = useState<BaseCard[]>([]);
  const [abilityCatalog, setAbilityCatalog] = useState<AbilityCatalog | null>(null);

  const refresh = useCallback(async () => {
    const [state, eff] = await Promise.all([adminApi.state(), adminApi.effects()]);
    setPacks(state.packs || []);
    setEffects(eff.effects || []);
    setCardTypes(eff.cardTypes || []);
    setView(state.mustChangePassword ? 'change-password' : 'dashboard');
    // best-effort side catalogs (not fatal if they fail)
    adminApi
      .baseCards()
      .then((r) => setBaseCards(r.cards || []))
      .catch(() => undefined);
    adminApi
      .abilityCatalog()
      .then((r) => setAbilityCatalog(r))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (view !== 'loading') return;
    refresh().catch((e) => {
      if (isAuthError(e)) {
        clearToken();
        setView('login');
      } else {
        setError(e.message || 'Could not load admin data');
        setView('login');
      }
    });
  }, [view, refresh]);

  // ---- login ----
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const doLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await adminApi.login(username.trim(), password);
      setToken(res.token);
      setPassword('');
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  // ---- change password ----
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');

  const doChangePw = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPw.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== newPw2) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await adminApi.changePassword(curPw, newPw);
      setToken(res.token);
      setCurPw('');
      setNewPw('');
      setNewPw2('');
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Could not change password');
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    clearToken();
    setUsername('');
    setPassword('');
    setView('login');
  };

  const guardedRefresh = () =>
    refresh().catch((e) => {
      if (isAuthError(e)) signOut();
      else setError(e.message || 'Something went wrong');
    });

  // ---------------------------------------------------------------- render
  if (view === 'loading') {
    return (
      <Screen>
        <Narrow>
          <PanelTitle>Admin</PanelTitle>
          <Muted>Loading…</Muted>
        </Narrow>
      </Screen>
    );
  }

  if (view === 'login') {
    return (
      <Screen>
        <Narrow>
          <PanelTitle>Admin sign in</PanelTitle>
          <form onSubmit={doLogin}>
            <Stack>
              <Label>
                Username
                <Field
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </Label>
              <Label>
                Password
                <Field
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </Label>
              {error && <ErrorText>{error}</ErrorText>}
              <Button type="submit" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
              <BackLink to="/">← Back to Game Night</BackLink>
            </Stack>
          </form>
        </Narrow>
      </Screen>
    );
  }

  if (view === 'change-password') {
    return (
      <Screen>
        <Narrow>
          <PanelTitle>Set a new password</PanelTitle>
          <Muted>
            You're signed in with the default credentials. Choose a new password before you can
            manage expansion packs.
          </Muted>
          <form onSubmit={doChangePw}>
            <Stack>
              <Label>
                Current password
                <Field
                  type="password"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                />
              </Label>
              <Label>
                New password (min 8 characters)
                <Field
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                />
              </Label>
              <Label>
                Confirm new password
                <Field
                  type="password"
                  value={newPw2}
                  onChange={(e) => setNewPw2(e.target.value)}
                  autoComplete="new-password"
                />
              </Label>
              {error && <ErrorText>{error}</ErrorText>}
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save new password'}
              </Button>
              <TextButton type="button" onClick={signOut}>
                Sign out
              </TextButton>
            </Stack>
          </form>
        </Narrow>
      </Screen>
    );
  }

  // ---- dashboard ----
  return (
    <Screen>
      <Wide>
        <HeaderRow>
          <PanelTitle style={{ margin: 0 }}>Custom expansions</PanelTitle>
          <HeaderActions>
            <BackLink to="/">← Game Night</BackLink>
            <TextButton type="button" onClick={signOut}>
              Sign out
            </TextButton>
          </HeaderActions>
        </HeaderRow>
        <Muted>
          Cards you add here are saved on the server and appear as a togglable expansion pack in the
          Unstable Unicorns lobby. No re-uploading needed.
        </Muted>

        {error && <ErrorText>{error}</ErrorText>}

        <NewPackForm
          busy={busy}
          onCreate={async (name, blurb) => {
            setError('');
            setBusy(true);
            try {
              await adminApi.createPack(name, blurb);
              await guardedRefresh();
            } catch (err: any) {
              setError(err.message || 'Could not create pack');
            } finally {
              setBusy(false);
            }
          }}
        />

        {packs.length === 0 && <Muted>No custom packs yet — create one above.</Muted>}

        {packs.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            effects={effects}
            cardTypes={cardTypes}
            baseCards={baseCards}
            abilityCatalog={abilityCatalog}
            onChanged={guardedRefresh}
            onError={(m) => setError(m)}
          />
        ))}
      </Wide>
    </Screen>
  );
};

// -------------------------------------------------------------- new pack form
const NewPackForm = ({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (name: string, blurb: string) => void;
}) => {
  const [name, setName] = useState('');
  const [blurb, setBlurb] = useState('');
  return (
    <SubPanel>
      <PanelSubtitle>New expansion pack</PanelSubtitle>
      <FormRow>
        <Label style={{ flex: '1 1 200px' }}>
          Pack name
          <Field value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kyle's Chaos Pack" />
        </Label>
        <Label style={{ flex: '2 1 260px' }}>
          Short description (optional)
          <Field value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="What's in it?" />
        </Label>
        <Button
          type="button"
          disabled={busy || name.trim().length < 2}
          onClick={() => {
            onCreate(name.trim(), blurb.trim());
            setName('');
            setBlurb('');
          }}
        >
          Create pack
        </Button>
      </FormRow>
    </SubPanel>
  );
};

// ------------------------------------------------------------------- pack card
const PackCard = ({
  pack,
  effects,
  cardTypes,
  baseCards,
  abilityCatalog,
  onChanged,
  onError,
}: {
  pack: StoredPack;
  effects: EffectOption[];
  cardTypes: string[];
  baseCards: BaseCard[];
  abilityCatalog: AbilityCatalog | null;
  onChanged: () => void;
  onError: (m: string) => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'one' | 'many'>('one');

  return (
    <SubPanel>
      <PackHeader>
        <div>
          <PackName>{pack.name}</PackName>
          {pack.blurb && <Muted style={{ margin: 0 }}>{pack.blurb}</Muted>}
          <Muted style={{ margin: '4px 0 0' }}>
            {pack.cards.length} card{pack.cards.length === 1 ? '' : 's'} · pack id <code>{pack.id}</code>
          </Muted>
        </div>
        <Button
          $variant="danger"
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm(`Delete "${pack.name}" and all its cards?`)) return;
            setBusy(true);
            try {
              await adminApi.deletePack(pack.id);
              onChanged();
            } catch (e: any) {
              onError(e.message || 'Could not delete pack');
            } finally {
              setBusy(false);
            }
          }}
        >
          Delete pack
        </Button>
      </PackHeader>

      {pack.cards.length > 0 && (
        <CardGrid>
          {pack.cards.map((c) => (
            <CardTile key={c.id}>
              <CardThumb src={ImageLoader.load(c.image)} alt={c.title} />
              <CardMeta>
                <strong>{c.title}</strong>
                <span>
                  {CARD_TYPE_LABELS[c.type] || c.type} · ×{c.count}
                </span>
                {c.ability ? (
                  <EffTag>custom ability</EffTag>
                ) : c.baseCardTitle ? (
                  <EffTag>plays as {c.baseCardTitle}</EffTag>
                ) : c.effectKey && c.effectKey !== 'none' ? (
                  <EffTag>{effects.find((e) => e.key === c.effectKey)?.label || c.effectKey}</EffTag>
                ) : null}
              </CardMeta>
              <DeleteX
                type="button"
                title="Remove card"
                onClick={async () => {
                  if (!window.confirm(`Remove "${c.title}"?`)) return;
                  try {
                    await adminApi.deleteCard(pack.id, c.id);
                    onChanged();
                  } catch (e: any) {
                    onError(e.message || 'Could not remove card');
                  }
                }}
              >
                ×
              </DeleteX>
            </CardTile>
          ))}
        </CardGrid>
      )}

      <ModeTabs>
        <ModeTab type="button" $active={mode === 'one'} onClick={() => setMode('one')}>
          Add one card
        </ModeTab>
        <ModeTab type="button" $active={mode === 'many'} onClick={() => setMode('many')}>
          Bulk upload
        </ModeTab>
      </ModeTabs>

      {mode === 'one' ? (
        <AddCardForm
          packId={pack.id}
          effects={effects}
          cardTypes={cardTypes}
          baseCards={baseCards}
          abilityCatalog={abilityCatalog}
          onAdded={onChanged}
          onError={onError}
        />
      ) : (
        <BulkAddForm
          packId={pack.id}
          baseCards={baseCards}
          onAdded={onChanged}
          onError={onError}
        />
      )}
    </SubPanel>
  );
};

// --------------------------------------------------------------- add card form
const AddCardForm = ({
  packId,
  effects,
  cardTypes,
  baseCards,
  onAdded,
  onError,
}: {
  packId: string;
  effects: EffectOption[];
  cardTypes: string[];
  baseCards: BaseCard[];
  abilityCatalog: AbilityCatalog | null;
  onAdded: () => void;
  onError: (m: string) => void;
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('basic');
  const [count, setCount] = useState('1');
  const [description, setDescription] = useState('');
  const [effectKey, setEffectKey] = useState('none');
  const [baseCardTitle, setBaseCardTitle] = useState('');
  const [behaviour, setBehaviour] = useState<'simple' | 'custom'>('simple');
  const [ability, setAbility] = useState<AbilitySpec>({
    mode: 'builder',
    trigger: 'enter',
    mandatory: true,
    steps: [],
    effects: [],
  });
  const [imageData, setImageData] = useState('');
  const [busy, setBusy] = useState(false);

  const abilityIsEmpty =
    behaviour !== 'custom' ||
    (ability.mode === 'builder'
      ? (ability.steps || []).length === 0 && (ability.effects || []).length === 0
      : !(ability.onJson || '').trim() && !(ability.passiveJson || '').trim());

  const typeOptions = cardTypes.length ? cardTypes : Object.keys(CARD_TYPE_LABELS);
  const effectOptions = useMemo(
    () => effects.filter((e) => e.types.indexOf(type) !== -1),
    [effects, type]
  );
  const linked = baseCards.find((b) => b.title === baseCardTitle);

  useEffect(() => {
    if (!effectOptions.find((e) => e.key === effectKey)) {
      setEffectKey('none');
    }
  }, [effectOptions, effectKey]);

  const pickImage = async (file?: File | null) => {
    if (!file) {
      setImageData('');
      return;
    }
    try {
      setImageData(await readFileAsDataUrl(file));
    } catch {
      onError('Could not read that image file.');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    onError('');
    if (title.trim().length < 1) {
      onError('Give the card a name.');
      return;
    }
    if (!imageData) {
      onError('Choose an image for the card.');
      return;
    }
    if (behaviour === 'custom' && abilityIsEmpty) {
      onError('Add at least one step or effect to the custom ability.');
      return;
    }
    setBusy(true);
    try {
      await adminApi.addCard(packId, {
        title: title.trim(),
        type,
        count: Math.max(1, Math.min(20, parseInt(count, 10) || 1)),
        description: description.trim(),
        effectKey: behaviour === 'custom' ? 'none' : effectKey,
        baseCardTitle: behaviour === 'custom' ? undefined : baseCardTitle || undefined,
        ability: behaviour === 'custom' ? ability : undefined,
        image: imageData,
      });
      setTitle('');
      setCount('1');
      setDescription('');
      setEffectKey('none');
      setBaseCardTitle('');
      setAbility({ mode: 'builder', trigger: 'enter', mandatory: true, steps: [], effects: [] });
      setBehaviour('simple');
      setImageData('');
      onAdded();
    } catch (err: any) {
      onError(err.message || 'Could not add the card');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <AddGrid>
        <Label>
          Card name
          <Field value={title} onChange={(e) => setTitle(e.target.value)} />
        </Label>
        <Label>
          Copies in deck
          <Field
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </Label>
        <Label>
          Card image (PNG / JPG / WebP)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => pickImage(e.target.files && e.target.files[0])}
          />
        </Label>

        <div style={{ gridColumn: '1 / -1' }}>
          <ModeTabs>
            <ModeTab
              type="button"
              $active={behaviour === 'simple'}
              onClick={() => setBehaviour('simple')}
            >
              Preset / plays-as
            </ModeTab>
            <ModeTab
              type="button"
              $active={behaviour === 'custom'}
              onClick={() => setBehaviour('custom')}
            >
              Custom ability
            </ModeTab>
          </ModeTabs>
        </div>

        {behaviour === 'simple' ? (
          <>
            <Label style={{ gridColumn: '1 / -1' }}>
              Plays as (full ability of a real card — optional)
              <Select value={baseCardTitle} onChange={(e) => setBaseCardTitle(e.target.value)}>
                <option value="">— no built-in ability —</option>
                {baseCards.map((b) => (
                  <option key={b.title} value={b.title}>
                    {b.title} ({CARD_TYPE_LABELS[b.type] || b.type})
                  </option>
                ))}
              </Select>
            </Label>

            {linked ? (
              <LinkedNote style={{ gridColumn: '1 / -1' }}>
                This card will behave exactly like <strong>{linked.title}</strong> — type{' '}
                <strong>{CARD_TYPE_LABELS[linked.type] || linked.type}</strong>.
                {linked.description ? <em> “{linked.description}”</em> : null}
              </LinkedNote>
            ) : (
              <>
                <Label>
                  Type
                  <Select value={type} onChange={(e) => setType(e.target.value)}>
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {CARD_TYPE_LABELS[t] || t}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label style={{ gridColumn: 'span 2' }}>
                  Preset effect
                  <Select value={effectKey} onChange={(e) => setEffectKey(e.target.value)}>
                    {effectOptions.map((e) => (
                      <option key={e.key} value={e.key}>
                        {e.label}
                      </option>
                    ))}
                  </Select>
                </Label>
              </>
            )}
          </>
        ) : (
          <>
            <Label>
              Type
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {CARD_TYPE_LABELS[t] || t}
                  </option>
                ))}
              </Select>
            </Label>
            <div style={{ gridColumn: '1 / -1' }}>
              <AbilityBuilder catalog={abilityCatalog} value={ability} onChange={setAbility} />
            </div>
          </>
        )}

        <Label style={{ gridColumn: '1 / -1' }}>
          Rules text (shown on the card, optional)
          <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Label>
        {imageData && <Preview src={imageData} alt="preview" />}
        <div style={{ gridColumn: '1 / -1' }}>
          <Button type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Add card'}
          </Button>
        </div>
      </AddGrid>
    </form>
  );
};

// --------------------------------------------------------------- ability builder
type AbilityStepLike = { action: string; params: Record<string, any> };

const RAW_EXAMPLE = `[
  { "trigger": "enter", "do": { "type": "add_scene", "info": {
    "mandatory": true, "endTurnImmediately": false,
    "actions": [
      { "instructions": [ { "protagonist": "owner",
        "do": { "key": "discard", "info": { "count": 2, "type": "any" } },
        "ui": { "type": "single_action_popup", "info": { "singleActionText": "Discard 2" } } } ] },
      { "instructions": [ { "protagonist": "owner",
        "do": { "key": "destroy", "info": { "type": "unicorn" } },
        "ui": { "type": "card_to_card" } } ] }
    ] } } }
]`;

const AbilityBuilder = ({
  catalog,
  value,
  onChange,
}: {
  catalog: AbilityCatalog | null;
  value: AbilitySpec;
  onChange: (s: AbilitySpec) => void;
}) => {
  const update = (patch: Partial<AbilitySpec>) => onChange({ ...value, ...patch });
  const steps = value.steps || [];
  const effects = value.effects || [];

  if (!catalog) {
    return <BuilderBox>Loading ability options…</BuilderBox>;
  }

  const actionById = (id: string) => catalog.actions.find((a) => a.id === id);
  const destroyTrigger = value.trigger === 'this_destroyed_or_sacrificed';

  const setStep = (i: number, patch: Partial<AbilityStepLike>) =>
    update({ steps: steps.map((s, k) => (k === i ? { ...s, ...patch } : s)) });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = steps.slice();
    const t = next[i];
    next[i] = next[j];
    next[j] = t;
    update({ steps: next });
  };

  return (
    <BuilderBox>
      <ModeTabs style={{ margin: '0 0 10px' }}>
        <ModeTab type="button" $active={value.mode !== 'raw'} onClick={() => update({ mode: 'builder' })}>
          Builder
        </ModeTab>
        <ModeTab type="button" $active={value.mode === 'raw'} onClick={() => update({ mode: 'raw' })}>
          Advanced (JSON)
        </ModeTab>
      </ModeTabs>

      {value.mode === 'raw' ? (
        <>
          <Muted style={{ marginTop: 0 }}>
            Paste an <code>on</code> array (list of <code>{'{ trigger, do }'}</code>). Every action
            key, ui type and effect key is checked against the engine's whitelist on save — anything
            unknown is rejected.
          </Muted>
          <Label>
            on (JSON array)
            <TextArea
              rows={8}
              value={value.onJson || ''}
              onChange={(e) => update({ onJson: e.target.value })}
              placeholder={RAW_EXAMPLE}
            />
          </Label>
          <Label>
            passive (JSON array of strings — optional)
            <TextArea
              rows={2}
              value={value.passiveJson || ''}
              onChange={(e) => update({ passiveJson: e.target.value })}
              placeholder={'["count_as_two"]'}
            />
          </Label>
        </>
      ) : (
        <>
          <Row2>
            <Label style={{ flex: '2 1 260px' }}>
              When does it happen?
              <Select
                value={value.trigger || 'enter'}
                onChange={(e) => update({ trigger: e.target.value })}
              >
                {catalog.triggers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Label>
            {!destroyTrigger && (
              <label
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, paddingBottom: 10 }}
              >
                <input
                  type="checkbox"
                  checked={value.mandatory !== false}
                  onChange={(e) => update({ mandatory: e.target.checked })}
                />
                Must do it (not optional)
              </label>
            )}
          </Row2>

          {destroyTrigger ? (
            <Muted>
              This trigger only supports the “return it to your hand instead” effect below. Step
              sequences aren't run on destruction.
            </Muted>
          ) : (
            <>
              <SubLabelText>Steps (run in order)</SubLabelText>
              {steps.length === 0 && <Muted style={{ margin: '4px 0' }}>No steps yet.</Muted>}
              {steps.map((s, i) => {
                const def = actionById(s.action);
                return (
                  <StepRow key={i}>
                    <span className="num">{i + 1}</span>
                    <Select
                      value={s.action}
                      onChange={(e) => setStep(i, { action: e.target.value, params: {} })}
                      style={{ minHeight: 34, fontSize: 13, flex: '1 1 240px' }}
                    >
                      {catalog.actions.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </Select>
                    {(def?.params || []).map((p) => (
                      <span key={p.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <small style={{ color: '#8aa' }}>{p.label}</small>
                        <Field
                          type="number"
                          min={p.min}
                          max={p.max}
                          value={String(s.params?.[p.name] ?? p.dflt ?? p.min ?? 1)}
                          onChange={(e) =>
                            setStep(i, { params: { ...(s.params || {}), [p.name]: e.target.value } })
                          }
                          style={{ width: 56, minHeight: 34, padding: '0.3em', letterSpacing: 'normal' }}
                        />
                      </span>
                    ))}
                    <MiniBtn type="button" title="Move up" onClick={() => move(i, -1)}>
                      ▲
                    </MiniBtn>
                    <MiniBtn type="button" title="Move down" onClick={() => move(i, 1)}>
                      ▼
                    </MiniBtn>
                    <MiniBtn
                      type="button"
                      title="Remove"
                      onClick={() => update({ steps: steps.filter((_, k) => k !== i) })}
                    >
                      ✕
                    </MiniBtn>
                  </StepRow>
                );
              })}
              <MiniBtn
                type="button"
                style={{ marginTop: 6, padding: '0.4em 0.8em' }}
                onClick={() =>
                  update({
                    steps: [...steps, { action: catalog.actions[0]?.id || 'draw', params: {} }],
                  })
                }
              >
                + Add step
              </MiniBtn>
            </>
          )}

          <SubLabelText style={{ marginTop: 14 }}>Persistent / passive effects</SubLabelText>
          <CheckGrid>
            {catalog.effects.map((e) => (
              <CheckItem key={e.id}>
                <input
                  type="checkbox"
                  checked={effects.indexOf(e.id) !== -1}
                  onChange={(ev) =>
                    update({
                      effects: ev.target.checked
                        ? [...effects, e.id]
                        : effects.filter((x) => x !== e.id),
                    })
                  }
                />
                {e.label}
              </CheckItem>
            ))}
          </CheckGrid>
        </>
      )}
    </BuilderBox>
  );
};

// ------------------------------------------------------------------ bulk upload
type StagedCard = {
  key: string;
  fileName: string;
  dataUrl: string;
  title: string;
  baseCardTitle: string;
  count: string;
  description: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};

const BulkAddForm = ({
  packId,
  baseCards,
  onAdded,
  onError,
}: {
  packId: string;
  baseCards: BaseCard[];
  onAdded: () => void;
  onError: (m: string) => void;
}) => {
  const [rows, setRows] = useState<StagedCard[]>([]);
  const [running, setRunning] = useState(false);
  const [countForAll, setCountForAll] = useState('1');
  const baseIndex = useMemo(() => buildBaseCardIndex(baseCards), [baseCards]);

  const setRow = (key: string, patch: Partial<StagedCard>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    onError('');
    const staged: StagedCard[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!/^image\//.test(f.type)) continue;
      let dataUrl = '';
      try {
        dataUrl = await readFileAsDataUrl(f);
      } catch {
        continue;
      }
      const guess = titleFromFilename(f.name);
      const match = matchBaseCard(guess, baseIndex);
      staged.push({
        key: `${Date.now()}_${i}_${f.name}`,
        fileName: f.name,
        dataUrl,
        title: match ? match.title : guess,
        baseCardTitle: match ? match.title : '',
        count: '1',
        description: '',
        status: 'pending',
      });
    }
    setRows((rs) => [...rs, ...staged]);
  };

  const autoMatchAll = () =>
    setRows((rs) =>
      rs.map((r) => {
        const m = matchBaseCard(r.title, baseIndex);
        return m ? { ...r, baseCardTitle: m.title, title: m.title } : r;
      })
    );

  const applyCountAll = () =>
    setRows((rs) => rs.map((r) => ({ ...r, count: countForAll })));

  // CSV: match a row by an "image"/"filename"/"name" column, fill title/rules/count.
  const importCsv = async (file?: File | null) => {
    if (!file) return;
    onError('');
    let text = '';
    try {
      text = await file.text();
    } catch {
      onError('Could not read the CSV file.');
      return;
    }
    const table = parseCsv(text);
    if (table.length < 2) {
      onError('That CSV looks empty.');
      return;
    }
    const header = table[0].map((h) => h.trim().toLowerCase());
    const col = (...names: string[]) => {
      for (let k = 0; k < names.length; k++) {
        const i = header.indexOf(names[k]);
        if (i !== -1) return i;
      }
      return -1;
    };
    const ci = {
      name: col('name', 'title', 'card', 'card name'),
      image: col('image', 'image_file', 'imagefile', 'filename', 'file'),
      rules: col('effect', 'rules', 'description', 'text', 'ability'),
      count: col('count', 'copies', 'qty', 'quantity'),
      playsAs: col('plays as', 'plays_as', 'base', 'basecard', 'template'),
    };
    const byFile: Record<string, string[]> = {};
    const byName: Record<string, string[]> = {};
    for (let i = 1; i < table.length; i++) {
      if (ci.image !== -1) byFile[imageKey(table[i][ci.image] || '')] = table[i];
      if (ci.name !== -1) byName[normalizeName(table[i][ci.name] || '')] = table[i];
    }

    setRows((rs) =>
      rs.map((r) => {
        const rec =
          (ci.image !== -1 && byFile[imageKey(r.fileName)]) || byName[normalizeName(r.title)];
        if (!rec) return r;
        const next = { ...r };
        if (ci.name !== -1 && rec[ci.name]) next.title = rec[ci.name].trim();
        if (ci.rules !== -1 && rec[ci.rules]) next.description = rec[ci.rules].trim();
        if (ci.count !== -1 && rec[ci.count] && /^\d+$/.test(rec[ci.count].trim()))
          next.count = rec[ci.count].trim();
        const playsAsName =
          (ci.playsAs !== -1 && rec[ci.playsAs]) || next.title;
        const m = matchBaseCard(playsAsName, baseIndex);
        if (m) next.baseCardTitle = m.title;
        return next;
      })
    );
  };

  const uploadAll = async () => {
    onError('');
    setRunning(true);
    const queue = rows.filter((r) => r.status !== 'done');
    for (let i = 0; i < queue.length; i++) {
      const r = queue[i];
      setRow(r.key, { status: 'uploading', error: undefined });
      try {
        await adminApi.addCard(packId, {
          title: r.title.trim() || titleFromFilename(r.fileName),
          type: 'basic', // ignored by the server when baseCardTitle is set
          count: Math.max(1, Math.min(20, parseInt(r.count, 10) || 1)),
          description: r.description.trim(),
          effectKey: 'none',
          baseCardTitle: r.baseCardTitle || undefined,
          image: r.dataUrl,
        });
        setRow(r.key, { status: 'done' });
      } catch (e: any) {
        setRow(r.key, { status: 'error', error: e.message || 'Failed' });
      }
    }
    setRunning(false);
    setRows((rs) => rs.filter((r) => r.status !== 'done'));
    onAdded();
  };

  const doneCount = rows.filter((r) => r.status === 'done').length;
  const errCount = rows.filter((r) => r.status === 'error').length;

  return (
    <div>
      <BulkBar>
        <label>
          <Button as="span">Choose images…</Button>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              addFiles(e.target.files);
              e.currentTarget.value = '';
            }}
          />
        </label>
        <label>
          <Button as="span" $variant="ghost">
            Import CSV…
          </Button>
          <input
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              importCsv(e.target.files && e.target.files[0]);
              e.currentTarget.value = '';
            }}
          />
        </label>
        {rows.length > 0 && (
          <>
            <TextButton type="button" onClick={autoMatchAll}>
              Auto-match names → real cards
            </TextButton>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Field
                type="number"
                min={1}
                max={20}
                value={countForAll}
                onChange={(e) => setCountForAll(e.target.value)}
                style={{ width: 64, minHeight: 34, padding: '0.3em 0.5em', letterSpacing: 'normal' }}
              />
              <TextButton type="button" onClick={applyCountAll}>
                set count for all
              </TextButton>
            </span>
            <TextButton type="button" onClick={() => setRows([])}>
              clear
            </TextButton>
          </>
        )}
      </BulkBar>

      {rows.length === 0 && (
        <Muted>
          Pick several card images at once. Each becomes a card; if the filename matches a real
          Unstable Unicorns card it's auto-linked so it plays with that card's full ability. Adjust
          rows below, then upload.
        </Muted>
      )}

      {rows.length > 0 && (
        <>
          <BulkTable>
            <thead>
              <tr>
                <th />
                <th>Name</th>
                <th>Plays as (ability)</th>
                <th>×</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} data-status={r.status}>
                  <td>
                    <RowThumb src={r.dataUrl} alt="" />
                  </td>
                  <td>
                    <Field
                      value={r.title}
                      onChange={(e) => setRow(r.key, { title: e.target.value })}
                      style={{ minHeight: 34, padding: '0.3em 0.5em', letterSpacing: 'normal', fontSize: 13 }}
                    />
                  </td>
                  <td>
                    <Select
                      value={r.baseCardTitle}
                      onChange={(e) => setRow(r.key, { baseCardTitle: e.target.value })}
                      style={{ minHeight: 34, padding: '0.3em 0.5em', fontSize: 13 }}
                    >
                      <option value="">— plain card (no ability) —</option>
                      {baseCards.map((b) => (
                        <option key={b.title} value={b.title}>
                          {b.title} ({CARD_TYPE_LABELS[b.type] || b.type})
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <Field
                      type="number"
                      min={1}
                      max={20}
                      value={r.count}
                      onChange={(e) => setRow(r.key, { count: e.target.value })}
                      style={{ width: 52, minHeight: 34, padding: '0.3em 0.4em', letterSpacing: 'normal' }}
                    />
                  </td>
                  <td>
                    <RowStatus data-s={r.status}>
                      {r.status === 'uploading'
                        ? '…'
                        : r.status === 'done'
                        ? '✓'
                        : r.status === 'error'
                        ? '!'
                        : ''}
                    </RowStatus>
                    <DeleteX
                      type="button"
                      style={{ position: 'static' }}
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    >
                      ×
                    </DeleteX>
                  </td>
                </tr>
              ))}
            </tbody>
          </BulkTable>
          {errCount > 0 && (
            <ErrorText>
              {errCount} card{errCount === 1 ? '' : 's'} failed:{' '}
              {rows
                .filter((r) => r.status === 'error')
                .map((r) => `${r.title} (${r.error})`)
                .join('; ')}
            </ErrorText>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Button type="button" disabled={running || rows.length === 0} onClick={uploadAll}>
              {running
                ? `Uploading… ${doneCount}/${rows.length}`
                : `Add ${rows.length} card${rows.length === 1 ? '' : 's'}`}
            </Button>
            {running && <Muted style={{ margin: 0 }}>Keep this tab open.</Muted>}
          </div>
        </>
      )}
    </div>
  );
};

// -------------------------------------------------------------------- styles
const Narrow = styled(Panel)`
  max-width: 420px;
  width: 100%;
`;

const Wide = styled(Panel)`
  max-width: 860px;
  width: 100%;
`;

const SubPanel = styled.div`
  margin-top: 18px;
  padding: 16px;
  border: 1px solid ${COLORS.panelBorder};
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
`;

const FormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  margin-top: 10px;
`;

const AddGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
`;

const ModeTabs = styled.div`
  display: flex;
  gap: 6px;
  margin: 18px 0 4px;
`;

const ModeTab = styled.button<{ $active: boolean }>`
  border: 1px solid ${COLORS.panelBorder};
  background: ${(p) => (p.$active ? 'rgba(124,92,255,0.35)' : 'transparent')};
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 0.45em 0.9em;
  border-radius: 999px;
  cursor: pointer;
`;

const BuilderBox = styled.div`
  border: 1px solid ${COLORS.panelBorder};
  border-radius: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.18);
  font-size: 13px;
`;

const Row2 = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
`;

const SubLabelText = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${COLORS.textMuted};
  margin: 8px 0 2px;
`;

const StepRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  border-top: 1px solid ${COLORS.panelBorder};

  .num {
    width: 18px;
    text-align: center;
    font-weight: 700;
    color: ${COLORS.textMuted};
  }
`;

const MiniBtn = styled.button`
  border: 1px solid ${COLORS.panelBorder};
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  border-radius: 7px;
  font-size: 12px;
  padding: 0.25em 0.5em;
  cursor: pointer;
  &:hover {
    background: rgba(255, 255, 255, 0.14);
  }
`;

const CheckGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px 12px;
`;

const CheckItem = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 7px;
  font-size: 12.5px;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.9);
`;

const LinkedNote = styled.div`
  font-size: 12.5px;
  line-height: 1.5;
  color: ${COLORS.textMuted};
  background: rgba(34, 211, 238, 0.08);
  border: 1px solid rgba(34, 211, 238, 0.3);
  border-radius: 10px;
  padding: 8px 10px;
  strong {
    color: #a5f3fc;
  }
`;

const BulkBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin: 12px 0;
`;

const BulkTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th {
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${COLORS.textMuted};
    padding: 4px 6px;
  }
  td {
    padding: 4px 6px;
    vertical-align: middle;
    border-top: 1px solid ${COLORS.panelBorder};
  }
  tr[data-status='error'] td {
    background: rgba(255, 77, 109, 0.1);
  }
  tr[data-status='done'] td {
    opacity: 0.5;
  }
`;

const RowThumb = styled.img`
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
`;

const RowStatus = styled.span`
  display: inline-block;
  width: 18px;
  text-align: center;
  font-weight: 800;
  color: ${COLORS.textMuted};
  &[data-s='done'] {
    color: #37d9a0;
  }
  &[data-s='error'] {
    color: #ff6b6b;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 14px;
  align-items: center;
`;

const PackHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
`;

const PackName = styled.div`
  font-family: 'Fredoka', 'Open Sans', sans-serif;
  font-weight: 700;
  font-size: 16px;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin: 14px 0;
`;

const CardTile = styled.div`
  position: relative;
  border: 1px solid ${COLORS.panelBorder};
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
`;

const CardThumb = styled.img`
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
`;

const CardMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 8px;
  font-size: 11px;
  color: ${COLORS.textMuted};

  strong {
    color: #fff;
    font-size: 12px;
  }
`;

const EffTag = styled.span`
  font-size: 10px;
  color: #a5f3fc;
`;

const DeleteX = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
`;

const Preview = styled.img`
  width: 100%;
  max-width: 140px;
  border-radius: 10px;
  border: 2px solid ${COLORS.panelBorder};
`;

const TextArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 0.7em 0.9em;
  background: ${COLORS.inputBg};
  border: 1.5px solid ${COLORS.panelBorder};
  border-radius: 12px;
  font-family: inherit;
  font-size: 14px;
  color: ${COLORS.text};
  outline: none;
  resize: vertical;
  &:focus {
    border-color: ${COLORS.accentB};
  }
`;

const Muted = styled.p`
  color: ${COLORS.textMuted};
  font-size: 13px;
  line-height: 1.5;
`;

const ErrorText = styled.div`
  color: #ff8a8a;
  font-size: 13px;
  margin: 8px 0;
`;

const BackLink = styled(Link)`
  color: ${COLORS.textMuted};
  font-size: 13px;
  text-decoration: none;
  &:hover {
    color: #fff;
  }
`;

const TextButton = styled.button`
  background: none;
  border: none;
  color: ${COLORS.textMuted};
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  &:hover {
    color: #fff;
  }
`;

export default AdminPanel;
