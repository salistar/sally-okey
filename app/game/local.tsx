/**
 * @file game/local.tsx
 * @description Local Okey game screen - Turkish Rummy vs bots
 * @project SallyCards - Okey
 */

import React, { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  gameReducer,
  initGame,
  botPlay,
  getCurrentPlayer,
  isPlayerTurn,
  formatCard,
  isStuck,
  SUIT_NAMES,
  VALUE_NAMES,
  type GameState,
} from '../../src/game/okeyEngine';
import { useTranslation } from 'react-i18next';
import { getCardImage, getCardBackImage } from '../../src/game/cardAssets';

const CARD_WIDTH = 50;
const CARD_HEIGHT = 75;

const PLAYER_ID = 'player-1';
const BOT_DELAY = 1200;

export default function OkeyLocalGame() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showStuck, setShowStuck] = useState(false);
  const [state, dispatch] = useReducer(gameReducer, null, () => {
    let s = initGame();
    s = gameReducer(s, {
      type: 'JOIN',
      playerId: PLAYER_ID,
      playerName: 'You',
    });
    s = gameReducer(s, {
      type: 'JOIN',
      playerId: 'bot-1',
      playerName: 'Mehmet',
      isBot: true,
    });
    s = gameReducer(s, {
      type: 'JOIN',
      playerId: 'bot-2',
      playerName: 'Ayse',
      isBot: true,
    });
    s = gameReducer(s, { type: 'START_GAME' });
    return s;
  });

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bot auto-play
  useEffect(() => {
    const current = getCurrentPlayer(state);
    if (!current || !current.isBot) return;
    if (state.phase === 'waiting' || state.phase === 'winning' || state.phase === 'game_over') return;

    botTimerRef.current = setTimeout(() => {
      const action = botPlay(state);
      if (action) {
        dispatch(action);
      }
    }, BOT_DELAY);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [state]);

  // Détection blocage : pioche+défausse vides + aucun joueur sortable
  useEffect(() => {
    if (showStuck) return;
    if (isStuck(state)) setShowStuck(true);
  }, [state, showStuck]);

  const humanPlayer = state.players.find((p) => p.id === PLAYER_ID);
  const isMyTurn = isPlayerTurn(state, PLAYER_ID);

  const handleDrawPile = useCallback(() => {
    if (!isMyTurn || state.phase !== 'drawing') return;
    dispatch({ type: 'DRAW_FROM_PILE', playerId: PLAYER_ID });
  }, [isMyTurn, state.phase]);

  const handleDrawDiscard = useCallback(() => {
    if (!isMyTurn || state.phase !== 'drawing') return;
    if (state.discardPile.length === 0) return;
    dispatch({ type: 'DRAW_FROM_DISCARD', playerId: PLAYER_ID });
  }, [isMyTurn, state.phase, state.discardPile.length]);

  const handleSelectCard = useCallback(
    (cardId: string) => {
      if (!isMyTurn || state.phase !== 'discarding') return;
      setSelectedCardId((prev) => (prev === cardId ? null : cardId));
    },
    [isMyTurn, state.phase]
  );

  const handleDiscard = useCallback(() => {
    if (!isMyTurn || !selectedCardId || state.phase !== 'discarding') return;
    dispatch({ type: 'DISCARD', playerId: PLAYER_ID, cardId: selectedCardId });
    setSelectedCardId(null);
  }, [isMyTurn, selectedCardId, state.phase]);

  const handleDeclareWin = useCallback(() => {
    if (!isMyTurn || state.phase !== 'discarding') return;
    dispatch({ type: 'DECLARE_WIN', playerId: PLAYER_ID });
  }, [isMyTurn, state.phase]);

  const handleNewRound = useCallback(() => {
    dispatch({ type: 'NEW_ROUND' });
    setSelectedCardId(null);
  }, []);

  const handleNewGame = useCallback(() => {
    dispatch({ type: 'RESET' });
    dispatch({ type: 'JOIN', playerId: PLAYER_ID, playerName: 'You' });
    dispatch({
      type: 'JOIN',
      playerId: 'bot-1',
      playerName: 'Mehmet',
      isBot: true,
    });
    dispatch({
      type: 'JOIN',
      playerId: 'bot-2',
      playerName: 'Ayse',
      isBot: true,
    });
    setTimeout(() => dispatch({ type: 'START_GAME' }), 100);
    setSelectedCardId(null);
  }, []);

  const topDiscard =
    state.discardPile.length > 0
      ? state.discardPile[state.discardPile.length - 1]
      : null;

  // Get display ID for card images (strip the "-2" suffix for duplicates)
  const getDisplayId = (id: string) => id.replace(/-2$/, '');

  return (
    <LinearGradient colors={['#164E63', '#0891B2', '#0E7490']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Okey</Text>
          <Text style={styles.phaseText}>
            {state.phase.toUpperCase()} | Round {state.roundNumber}
          </Text>
        </View>

        {/* Joker Info */}
        <View style={styles.jokerArea}>
          <Text style={styles.jokerLabel}>Joker:</Text>
          <Image
            source={getCardImage(getDisplayId(state.jokerCard.id))}
            style={styles.jokerCard}
          />
          <Text style={styles.jokerText}>
            {VALUE_NAMES[state.jokerCard.value]} de{' '}
            {SUIT_NAMES[state.jokerCard.suit]}
          </Text>
        </View>

        {/* Opponents */}
        <View style={styles.opponentsRow}>
          {state.players
            .filter((p) => p.id !== PLAYER_ID)
            .map((bot) => (
              <View
                key={bot.id}
                style={[
                  styles.opponentBox,
                  getCurrentPlayer(state)?.id === bot.id && styles.activePlayer,
                ]}
              >
                <Text style={styles.opponentName}>{bot.name}</Text>
                <Text style={styles.cardCount}>{bot.hand.length} tiles</Text>
              </View>
            ))}
        </View>

        {/* Draw & Discard Piles */}
        <View style={styles.pilesArea}>
          <TouchableOpacity
            onPress={handleDrawPile}
            disabled={!isMyTurn || state.phase !== 'drawing'}
            style={styles.pileWrapper}
          >
            <Image source={getCardBackImage()} style={styles.pileCard} />
            <Text style={styles.pileLabel}>
              Draw ({state.drawPile.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDrawDiscard}
            disabled={
              !isMyTurn || state.phase !== 'drawing' || !topDiscard
            }
            style={styles.pileWrapper}
          >
            {topDiscard ? (
              <Image
                source={getCardImage(getDisplayId(topDiscard.id))}
                style={styles.pileCard}
              />
            ) : (
              <View style={styles.emptyPile} />
            )}
            <Text style={styles.pileLabel}>
              Discard ({state.discardPile.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <Text style={styles.statusText}>{state.lastAction}</Text>
        {isMyTurn && (
          <Text style={styles.turnIndicator}>
            {state.phase === 'drawing'
              ? 'Tap a pile to draw'
              : state.phase === 'discarding'
              ? 'Select a card to discard'
              : ''}
          </Text>
        )}

        {/* Player Hand */}
        {humanPlayer && (
          <View style={styles.playerArea}>
            <Text style={styles.playerName}>
              Your Tiles ({humanPlayer.hand.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.handRow}>
                {humanPlayer.hand.map((card) => {
                  const isSelected = selectedCardId === card.id;
                  const isJoker = card.isJoker;
                  return (
                    <TouchableOpacity
                      key={card.id}
                      onPress={() => handleSelectCard(card.id)}
                      disabled={state.phase !== 'discarding' || !isMyTurn}
                    >
                      <View
                        style={[
                          styles.cardWrapper,
                          isSelected && styles.selectedCard,
                          isJoker && styles.jokerHighlight,
                        ]}
                      >
                        <Image
                          source={getCardImage(getDisplayId(card.id))}
                          style={styles.playerCard}
                        />
                        {isJoker && (
                          <Text style={styles.jokerBadge}>J</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        {isMyTurn && state.phase === 'discarding' && (
          <View style={styles.actions}>
            {selectedCardId && (
              <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
                <Text style={styles.actionText}>Discard Selected</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.winBtn} onPress={handleDeclareWin}>
              <Text style={styles.actionText}>Declare Win</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Win / Game Over */}
        {state.phase === 'winning' && (
          <View style={styles.winArea}>
            <Text style={styles.winText}>
              {state.players.find((p) => p.id === state.winnerId)?.name} wins
              the round!
            </Text>
            <TouchableOpacity style={styles.newRoundBtn} onPress={handleNewRound}>
              <Text style={styles.newGameText}>Next Round</Text>
            </TouchableOpacity>
          </View>
        )}

        {state.phase === 'game_over' && (
          <View style={styles.gameOverArea}>
            <Text style={styles.gameOverText}>Game Over!</Text>
            <TouchableOpacity style={styles.newGameBtn} onPress={handleNewGame}>
              <Text style={styles.newGameText}>New Game</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Modal blocage Okey : pioche+défausse vides, personne ne peut sortir */}
        <Modal visible={showStuck} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' }}>
            <LinearGradient colors={['#7F1D1D', '#1F1216']} style={{ padding: 28, borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: '#EF4444', minWidth: 280, maxWidth: 360 }}>
              <Text style={{ fontSize: 56 }}>🔒</Text>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 8, textAlign: 'center' }}>{t('stuck.title')}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{t('stuck.body')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
                <TouchableOpacity onPress={() => { setShowStuck(false); dispatch({ type: 'NEW_ROUND' }); }} style={{ backgroundColor: '#EF4444', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>🔄 {t('stuck.again')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowStuck(false)} style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{t('stuck.continue')}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 12 },
  header: { alignItems: 'center', paddingVertical: 6 },
  backBtn: { position: 'absolute', left: 0, top: 6 },
  backText: { color: '#A5F3FC', fontSize: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  phaseText: { color: '#A5F3FC', fontSize: 12, marginTop: 2 },
  jokerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 4,
  },
  jokerLabel: { color: '#FCD34D', fontWeight: 'bold', fontSize: 14 },
  jokerCard: { width: 36, height: 54, borderRadius: 4 },
  jokerText: { color: '#FCD34D', fontSize: 13 },
  opponentsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  opponentBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 8,
    minWidth: 100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activePlayer: { borderColor: '#FCD34D' },
  opponentName: { color: '#fff', fontWeight: '600', fontSize: 13 },
  cardCount: { color: '#A5F3FC', fontSize: 12 },
  pilesArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginVertical: 12,
  },
  pileWrapper: { alignItems: 'center' },
  pileCard: { width: 60, height: 90, borderRadius: 6 },
  emptyPile: {
    width: 60,
    height: 90,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  pileLabel: { color: '#A5F3FC', fontSize: 11, marginTop: 4 },
  statusText: {
    color: '#CFFAFE',
    textAlign: 'center',
    fontSize: 13,
    marginVertical: 4,
  },
  turnIndicator: {
    color: '#FCD34D',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  playerArea: { alignItems: 'center', marginTop: 8 },
  playerName: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 6 },
  handRow: { flexDirection: 'row', gap: 3, paddingHorizontal: 4 },
  cardWrapper: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 6,
    padding: 1,
  },
  selectedCard: {
    borderColor: '#FCD34D',
    backgroundColor: 'rgba(252,211,77,0.2)',
    transform: [{ translateY: -8 }],
  },
  jokerHighlight: {
    borderColor: '#F87171',
    backgroundColor: 'rgba(248,113,113,0.15)',
  },
  playerCard: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 4 },
  jokerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    width: 16,
    height: 16,
    borderRadius: 8,
    textAlign: 'center',
    lineHeight: 16,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
  },
  discardBtn: {
    backgroundColor: 'rgba(239,68,68,0.4)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  winBtn: {
    backgroundColor: 'rgba(34,197,94,0.4)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  winArea: { alignItems: 'center', marginTop: 16 },
  winText: { color: '#FCD34D', fontSize: 18, fontWeight: 'bold' },
  newRoundBtn: {
    backgroundColor: '#0891B2',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  gameOverArea: { alignItems: 'center', marginTop: 20 },
  gameOverText: { color: '#FCD34D', fontSize: 20, fontWeight: 'bold' },
  newGameBtn: {
    backgroundColor: '#0891B2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  newGameText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
