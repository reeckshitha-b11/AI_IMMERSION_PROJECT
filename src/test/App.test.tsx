import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Activity } from 'lucide-react';
import { AuthScreen, StatusPill, StatCard, NotificationsPanel, demoAccounts } from '@/App';
import { supabase } from '@/lib/supabase';
import type { Notification, Profile } from '@/types';

// ── Helpers ─────────────────────────────────────────────────────
function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return { id: 'user-1', full_name: 'Test User', role: 'patient', specialty: null, ...overrides };
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    user_id: 'user-1',
    type: 'patient_feedback',
    title: 'Test title',
    message: 'Test message',
    video_id: null,
    is_read: false,
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    ...overrides,
  };
}

// Type helper for the mocked supabase module
type MockedSupabase = {
  auth: {
    signInWithPassword: ReturnType<typeof vi.fn>;
    signUp: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
  functions: { invoke: ReturnType<typeof vi.fn> };
  storage: { from: ReturnType<typeof vi.fn> };
};

function getMock(): MockedSupabase {
  return supabase as unknown as MockedSupabase;
}

// ── Tests ───────────────────────────────────────────────────────

describe('StatusPill', () => {
  it('renders "Pending review" for pending status', () => {
    render(<StatusPill status="pending" />);
    expect(screen.getByText('Pending review')).toBeInTheDocument();
  });

  it('renders "Under review" for under_review status', () => {
    render(<StatusPill status="under_review" />);
    expect(screen.getByText('Under review')).toBeInTheDocument();
  });

  it('renders "Reviewed" for reviewed status', () => {
    render(<StatusPill status="reviewed" />);
    expect(screen.getByText('Reviewed')).toBeInTheDocument();
  });

  it('falls back to "Pending review" for unknown status', () => {
    render(<StatusPill status="unknown" />);
    expect(screen.getByText('Pending review')).toBeInTheDocument();
  });
});

describe('StatCard', () => {
  it('renders label, value, and detail', () => {
    render(
      <StatCard
        icon={Activity}
        label="Activity updates"
        value={5}
        detail="all time"
      />,
    );
    expect(screen.getByText('Activity updates')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('all time')).toBeInTheDocument();
  });

  it('renders string values', () => {
    render(
      <StatCard
        icon={Activity}
        label="Diagnosis"
        value="Recovering"
        detail="current"
      />,
    );
    expect(screen.getByText('Recovering')).toBeInTheDocument();
  });
});

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign-in heading by default', () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    expect(screen.getByText('Sign in to AfterCare')).toBeInTheDocument();
  });

  it('switches to sign-up form when toggling', () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fireEvent.click(screen.getByText('New to AfterCare? Create an account'));
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument();
  });

  it('shows role selection buttons in sign-up mode', () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fireEvent.click(screen.getByText('New to AfterCare? Create an account'));
    expect(screen.getByText('patient')).toBeInTheDocument();
    expect(screen.getByText('doctor')).toBeInTheDocument();
  });

  it('shows both demo account buttons', () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    expect(screen.getByText(demoAccounts[0].label)).toBeInTheDocument();
    expect(screen.getByText(demoAccounts[1].label)).toBeInTheDocument();
  });

  it('calls signInWithPassword on sign-in submit', async () => {
    const mock = getMock();
    mock.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mock.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: makeProfile(),
          }),
        }),
      }),
    });

    const onAuth = vi.fn();
    render(<AuthScreen onAuth={onAuth} />);

    await userEvent.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password (10+ characters)'), 'password123');
    fireEvent.click(screen.getByText('Sign in'));

    await vi.waitFor(() => {
      expect(mock.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows error message when sign-in fails', async () => {
    const mock = getMock();
    mock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid credentials' },
    });

    render(<AuthScreen onAuth={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('Email address'), 'bad@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password (10+ characters)'), 'badpassword1');
    fireEvent.click(screen.getByText('Sign in'));

    await vi.waitFor(() => {
      expect(screen.getByText('We could not complete that request. Please check your details and try again.')).toBeInTheDocument();
    });
  });

  it('calls signInWithPassword with demo credentials on demo button click', async () => {
    const mock = getMock();
    mock.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mock.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: makeProfile({ full_name: 'Jordan Lee', role: 'patient' }),
          }),
        }),
      }),
    });

    const onAuth = vi.fn();
    render(<AuthScreen onAuth={onAuth} />);

    fireEvent.click(screen.getByText(demoAccounts[0].label));

    await vi.waitFor(() => {
      expect(mock.auth.signInWithPassword).toHaveBeenCalledWith({
        email: demoAccounts[0].email,
        password: 'AfterCareDemo!2026',
      });
    });
  });

  it('shows demo error when demo login fails', async () => {
    const mock = getMock();
    mock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid' },
    });

    render(<AuthScreen onAuth={vi.fn()} />);
    fireEvent.click(screen.getByText(demoAccounts[0].label));

    await vi.waitFor(() => {
      expect(screen.getByText('Demo sign-in is temporarily unavailable.')).toBeInTheDocument();
    });
  });

  it('calls signUp on sign-up submit with user metadata', async () => {
    const mock = getMock();
    mock.auth.signUp.mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null,
    });
    mock.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: makeProfile({ full_name: 'New Person', role: 'patient' }),
          }),
        }),
      }),
    });

    const onAuth = vi.fn();
    render(<AuthScreen onAuth={onAuth} />);

    fireEvent.click(screen.getByText('New to AfterCare? Create an account'));

    await userEvent.type(screen.getByPlaceholderText('Full name'), 'New Person');
    await userEvent.type(screen.getByPlaceholderText('Email address'), 'new@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password (10+ characters)'), 'strongpass1');
    fireEvent.click(screen.getByText('Create account'));

    await vi.waitFor(() => {
      expect(mock.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'strongpass1',
        options: {
          data: { full_name: 'New Person', role: 'patient' },
        },
      });
    });
  });
});

describe('NotificationsPanel', () => {
  it('shows empty state when no notifications', () => {
    render(<NotificationsPanel notifications={[]} onRead={vi.fn()} />);
    expect(screen.getByText('No notifications yet.')).toBeInTheDocument();
  });

  it('renders notification items', () => {
    const notifs = [
      makeNotification({ id: 'n1', title: 'First notification', message: 'Message one' }),
      makeNotification({ id: 'n2', title: 'Second notification', message: 'Message two', is_read: true }),
    ];
    render(<NotificationsPanel notifications={notifs} onRead={vi.fn()} />);
    expect(screen.getByText('First notification')).toBeInTheDocument();
    expect(screen.getByText('Second notification')).toBeInTheDocument();
  });

  it('calls onRead when a notification is clicked', () => {
    const onRead = vi.fn();
    const notifs = [makeNotification({ id: 'n1' })];
    render(<NotificationsPanel notifications={notifs} onRead={onRead} />);
    fireEvent.click(screen.getByText('Test title'));
    expect(onRead).toHaveBeenCalledWith('n1');
  });

  it('shows "Read" for read notifications and "Mark as read" for unread', () => {
    const notifs = [
      makeNotification({ id: 'n1', is_read: false }),
      makeNotification({ id: 'n2', is_read: true }),
    ];
    render(<NotificationsPanel notifications={notifs} onRead={vi.fn()} />);
    expect(screen.getByText(/Mark as read/)).toBeInTheDocument();
    expect(screen.getByText(/Read/)).toBeInTheDocument();
  });
});
