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
  EffectOption,
  StoredPack,
} from './adminApi';

type View = 'loading' | 'login' | 'change-password' | 'dashboard';

const AdminPanel = () => {
  const [view, setView] = useState<View>(getToken() ? 'loading' : 'login');
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const [packs, setPacks] = useState<StoredPack[]>([]);
  const [effects, setEffects] = useState<EffectOption[]>([]);
  const [cardTypes, setCardTypes] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const [state, eff] = await Promise.all([adminApi.state(), adminApi.effects()]);
    setPacks(state.packs || []);
    setEffects(eff.effects || []);
    setCardTypes(eff.cardTypes || []);
    setView(state.mustChangePassword ? 'change-password' : 'dashboard');
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
  onChanged,
  onError,
}: {
  pack: StoredPack;
  effects: EffectOption[];
  cardTypes: string[];
  onChanged: () => void;
  onError: (m: string) => void;
}) => {
  const [busy, setBusy] = useState(false);

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
                {c.effectKey && c.effectKey !== 'none' && (
                  <EffTag>{effects.find((e) => e.key === c.effectKey)?.label || c.effectKey}</EffTag>
                )}
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

      <AddCardForm
        packId={pack.id}
        effects={effects}
        cardTypes={cardTypes}
        onAdded={onChanged}
        onError={onError}
      />
    </SubPanel>
  );
};

// --------------------------------------------------------------- add card form
const AddCardForm = ({
  packId,
  effects,
  cardTypes,
  onAdded,
  onError,
}: {
  packId: string;
  effects: EffectOption[];
  cardTypes: string[];
  onAdded: () => void;
  onError: (m: string) => void;
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('basic');
  const [count, setCount] = useState('1');
  const [description, setDescription] = useState('');
  const [effectKey, setEffectKey] = useState('none');
  const [imageData, setImageData] = useState('');
  const [busy, setBusy] = useState(false);

  const typeOptions = cardTypes.length ? cardTypes : Object.keys(CARD_TYPE_LABELS);
  const effectOptions = useMemo(
    () => effects.filter((e) => e.types.indexOf(type) !== -1),
    [effects, type]
  );

  useEffect(() => {
    // reset the effect if it isn't valid for the newly-chosen type
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
    setBusy(true);
    try {
      await adminApi.addCard(packId, {
        title: title.trim(),
        type,
        count: Math.max(1, Math.min(20, parseInt(count, 10) || 1)),
        description: description.trim(),
        effectKey,
        image: imageData,
      });
      setTitle('');
      setCount('1');
      setDescription('');
      setEffectKey('none');
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
          Type
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {CARD_TYPE_LABELS[t] || t}
              </option>
            ))}
          </Select>
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
        <Label style={{ gridColumn: '1 / -1' }}>
          Effect
          <Select value={effectKey} onChange={(e) => setEffectKey(e.target.value)}>
            {effectOptions.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
          </Select>
        </Label>
        <Label style={{ gridColumn: '1 / -1' }}>
          Rules text (shown on the card, optional)
          <TextArea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
