import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { CampItem } from '../models/item.model';
import { Session } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabase.url, environment.supabase.anonKey);
  }

  // --- Sessions ---
  async createSession(session: Session): Promise<void> {
    const { error } = await this.client.from('sessions').insert({
      id: session.id,
      name: session.name,
      created_at: session.createdAt,
      created_by: session.createdBy,
    });
    if (error) throw error;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const { data, error } = await this.client
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    if (error || !data) return null;
    return { id: data.id, name: data.name, createdAt: data.created_at, createdBy: data.created_by };
  }

  // --- Items ---
  async fetchItems(sessionId: string): Promise<CampItem[]> {
    const { data, error } = await this.client
      .from('items')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(this.rowToItem);
  }

  subscribeToItems(sessionId: string, onChange: () => void): RealtimeChannel {
    return this.client
      .channel(`items:${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'items',
        filter: `session_id=eq.${sessionId}`,
      }, onChange)
      .subscribe();
  }

  unsubscribe(channel: RealtimeChannel): void {
    this.client.removeChannel(channel);
  }

  async addItem(sessionId: string, item: Omit<CampItem, 'id'>): Promise<void> {
    const { error } = await this.client.from('items').insert({
      session_id: sessionId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      assigned_to: item.assignedTo,
      bought: item.bought,
      bought_by: item.boughtBy ?? null,
      bought_at: item.boughtAt ?? null,
      added_by: item.addedBy,
      created_at: item.createdAt,
    });
    if (error) throw error;
  }

  async updateItem(itemId: string, changes: Partial<CampItem>): Promise<void> {
    const row: Record<string, any> = {};
    if (changes.name !== undefined) row['name'] = changes.name;
    if (changes.category !== undefined) row['category'] = changes.category;
    if (changes.quantity !== undefined) row['quantity'] = changes.quantity;
    if (changes.assignedTo !== undefined) row['assigned_to'] = changes.assignedTo;
    if (changes.bought !== undefined) row['bought'] = changes.bought;
    if ('boughtBy' in changes) row['bought_by'] = changes.boughtBy ?? null;
    if ('boughtAt' in changes) row['bought_at'] = changes.boughtAt ?? null;
    const { error } = await this.client.from('items').update(row).eq('id', itemId);
    if (error) throw error;
  }

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await this.client.from('items').delete().eq('id', itemId);
    if (error) throw error;
  }

  private rowToItem(row: any): CampItem {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      quantity: row.quantity,
      assignedTo: row.assigned_to,
      bought: row.bought,
      boughtBy: row.bought_by ?? undefined,
      boughtAt: row.bought_at ?? undefined,
      addedBy: row.added_by,
      createdAt: row.created_at,
    };
  }
}
