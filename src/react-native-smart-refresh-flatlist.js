/**
 * Created by harry yang on 17/11/19.
 */

import React, { Component } from 'react';
import {
    View,
    Text,
    RefreshControl,
    PanResponder,
    Animated,
    Easing,
    Dimensions,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Platform,
    NetInfo,
    Alert,
    // ART
} from 'react-native';
import PureRenderMixin from 'react-addons-pure-render-mixin';
// const { Surface, Shape, Path, LinearGradient } = ART;

// let AnimatedShape = Animated.createAnimatedComponent(Shape);
// let AnimatedSurface = Animated.createAnimatedComponent(Surface);
const { width, height } = Dimensions.get('window')
const pullOkMargin = 100; //下拉到ok状态时topindicator距离顶部的距离
const defaultDuration = 300;
const defaultTopIndicatorHeight = 100; //顶部刷新指示器的高度
const defaultFlag = { pulling: false, pullok: false, pullrelease: false, pullSuccess: false };
const flagPulling = { pulling: true, pullok: false, pullrelease: false, pullSuccess: false };
const flagPullok = { pulling: false, pullok: true, pullrelease: false, pullSuccess: false };
const flagPullrelease = { pulling: false, pullok: false, pullrelease: true, pullSuccess: false };
const flagPullSuccess = { pulling: false, pullok: false, pullrelease: false, pullSuccess: true };


export default class SmartFlatList extends Component {
    constructor(props) {
        super(props);
        this.page = 0;
        this.num = 0
        this.AsycConnectedChange = this.props.AsycConnectedChange || 'change'
        this.pullable = this.props.refreshControl == null;
        this.topIndicatorHeight = this.props.topIndicatorHeight || defaultTopIndicatorHeight;
        this.defaultXY = { x: 0, y: this.topIndicatorHeight * -1 };
        this.pullOkMargin = this.props.pullOkMargin || pullOkMargin;
        this.duration = this.props.duration || defaultDuration;
        this.state = {
            pullPan: new Animated.ValueXY(this.defaultXY),
            scrollEnabled: false,
            flag: defaultFlag,
            prArrowDeg: new Animated.Value(0),
            dataList: [],
            isFirst: true,
            hasNoData: false,
            isRefreshing: false,
            error: false,
            arcHeight: new Animated.Value(0)

        };
        this.onFetch = this.props.onFetch || new Error('onFetch can not be undefined')
        this.renderItem = this.props.renderItem || new Error('renderItem can not be undefined')
        this.pageSize = this.props.pageSize || 10;
        this.page = this.props.initialPage || 0;
        this.topBackgroundColor = this.props.topBackgroundColor || '#eca02a'
        this.gesturePosition = { x: 0, y: 0 };
        this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
        this.panResponder = PanResponder.create({
            onStartShouldSetPanResponder: (e, gesture) => this.onShouldSetPanResponder(e, gesture),
            onMoveShouldSetPanResponder: (e, gesture) => this.onShouldSetPanResponder(e, gesture),
            onPanResponderStart: () => { },
            onPanResponderGrant: (e, gesture) => {

            },
            onPanResponderMove: (e, gesture) => this.onPanResponderMove(e, gesture),
            onPanResponderRelease: (e, gesture) => this.onPanResponderRelease(e, gesture),
            onPanResponderEnd: () => { },
            onPanResponderTerminate: (e, gesture) => this.onPanResponderRelease(e, gesture),
            onStartShouldSetResponderCapture: (e, gesture) => this.onStartShouldSetResponderCapture(e, gesture),
            onMoveShouldSetResponderCapture: (e, gesture) => this.onStartShouldSetResponderCapture(e, gesture),
        });
        this.setFlag(defaultFlag);
        this.base64Icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAABQBAMAAAD8TNiNAAAAJ1BMVEUAAACqqqplZWVnZ2doaGhqampoaGhpaWlnZ2dmZmZlZWVmZmZnZ2duD78kAAAADHRSTlMAA6CYqZOlnI+Kg/B86E+1AAAAhklEQVQ4y+2LvQ3CQAxGLSHEBSg8AAX0jECTnhFosgcjZKr8StE3VHz5EkeRMkF0rzk/P58k9rgOW78j+TE99OoeKpEbCvcPVDJ0OvsJ9bQs6Jxs26h5HCrlr9w8vi8zHphfmI0fcvO/ZXJG8wDzcvDFO2Y/AJj9ADE7gXmlxFMIyVpJ7DECzC9J2EC2ECAAAAAASUVORK5CYII=';

    }


    /*=========================panResponder--start=========================*/
    onStartShouldSetResponderCapture() {
        return true
    }
    onShouldSetPanResponder(e, gesture) {

        if (!this.pullable || this.state.isFirst || !this.isVerticalGesture(gesture.dx, gesture.dy)) {

            //不使用pullable,或非向上 或向下手势不响应,或第一次加载还在加载页面的时候
            return false;
        }
        if (!this.state.scrollEnabled) {
            this.lastY = this.state.pullPan.y._value;
            let gestureOffsetY = gesture.dy / 2;
            let moveY = this.lastY + gestureOffsetY;
            return moveY < this.pullOkMargin
        } else {
            return false;
        }
    }
    onPanResponderMove(e, gesture) {
        this.gesturePosition = { x: this.defaultXY.x, y: gesture.dy };
        let gestureOffsetY = gesture.dy / 2;
        let moveY = this.lastY + gestureOffsetY;
        if (this.isUpGesture(gesture.dx, gesture.dy)) { //向上滑动

            if (this.isPullState()) {
                this.resetDefaultXYHandler();
            } else if (this.props.onPushing && this.props.onPushing(this.gesturePosition)) {
                // do nothing, handling by this.props.onPushing
            } else {
                this.scroll.scrollToOffset({
                    animated: true,
                    offset: gesture.dy * -1
                });
            }
            return;
        } else if (this.isDownGesture(gesture.dx, gesture.dy) && moveY < this.pullOkMargin) { //下拉


            if (gestureOffsetY < this.topIndicatorHeight) { //正在下拉

                this.state.pullPan.setValue({ x: this.defaultXY.x, y: moveY });

                if (!this.flag.pulling) {
                    this.props.onPulling && this.props.onPulling();
                }
                this.setFlag(flagPulling);

            } else if (moveY >= 0 && moveY < this.pullOkMargin) { //下拉到位，但并没有进行刷新

                // this.state.arcHeight.setValue(this.lastY + gesture.dy / 2.8)

                // this.setState({
                //     arcHeight: this.deepClone(this.state.arcHeight)
                // })

                this.state.pullPan.setValue({ x: this.defaultXY.x, y: moveY });
                if (!this.state.pullok) {
                    this.props.onPullOk && this.props.onPullOk();
                }
                this.setFlag(flagPullok);
            }
        }
    }

    onPanResponderRelease(e, gesture) {
        if (this.flag.pulling) { //没有下拉到位
            this.resetDefaultXYHandler(); //重置状态
        }
        if (this.flag.pullok && !this.state.isRefreshing) {
            this.state.arcHeight.stopAnimation();
            this.state.pullPan.stopAnimation();
            this._refreshHandle(() => this._refreshing())
            // this.arcHeight = Animated.timing(this.state.arcHeight, {
            //     toValue: 0,
            //     easing: Easing.linear,
            //     duration: this.duration + 500

            // }).start(//动画完成后执行下一步
            //     () => { this._refreshHandle(() => this._refreshing()) })
        }
    }
    onScroll(e) {
        if (e.nativeEvent.contentOffset.y <= 0) {
            this.setState({ scrollEnabled: false });
        } else if (!this.isPullState()) {
            this.setState({ scrollEnabled: true });
        }
    }
    /*=========================panResponder--end=========================*/

    /*=========================util--start=========================*/
    isDownGesture = (x, y) => {
        return y > 0 && (y > Math.abs(x));
    };
    isUpGesture = (x, y) => {
        return y < 0 && (Math.abs(x) < Math.abs(y));
    };
    isVerticalGesture = (x, y) => {

        return (Math.abs(x) < Math.abs(y));
    };
    onLayout(e) {
        this.setState({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height
        })
    }
    deepClone(origin) {
        try {
            let origins = Object.getPrototypeOf(origin)
            return Object.assign(Object.create(origins), origin)
        } catch (error) {
            console.log(origin)
        }


    }
    DiffRecursive(obj1, obj2) {
        for (var p in obj2) {
            try {
                if (obj2[p].constructor == Object) {
                    obj1[p] = DiffRecursive(obj1[p], obj2[p]);
                } else {
                    if (obj1[p] !== obj2[p]) return false;
                }
            } catch (e) {
                console.log(e)
                return '报错';
            }
        }
        return true;
    }
    setFlag(flag) {
        if (this.flag != flag) {
            this.flag = flag;
            this.renderTopIndicator();
        }
    }
    isAndroid() {
        return Platform.OS === 'android'
    }
    AsycConnected() {
        let AsycConnectedChange =   this.AsycConnectedChange
        if (this.isAndroid()) {
            return NetInfo.isConnected.fetch();
        } else {
            return new Promise(function (resolve, reject) {
                let connect = function handleFirstConnectivityChange(isConnected) {
                    NetInfo.isConnected.removeEventListener(
                        AsycConnectedChange,
                        connect
                    );
                    resolve(isConnected)
                }
                NetInfo.isConnected.addEventListener( AsycConnectedChange, connect);
            });
        }
    };
    _refreshHandle(callback) {
        Animated.sequence([
            Animated.timing(this.state.arcHeight, {
                toValue: 0,
                easing: Easing.linear,

            }).start(),
            Animated.timing(this.state.pullPan, {
                toValue: { x: 0, y: 0 },
                easing: Easing.linear,
                duration: this.duration
            }).start(() => callback())
        ])

    }

    resetDefaultXYHandler() {


        Animated.sequence([          // 在decay之后并行执行：
            Animated.timing(this.state.arcHeight, {
                toValue: 0,
                easing: Easing.linear,

            }).start(),
            Animated.timing(this.state.pullPan, {
                toValue: { x: 0, y: this.topIndicatorHeight * -1 },
                easing: Easing.linear,
                duration: this.duration
            }).start(() => {
                this.txtPulling && this.txtPulling.setNativeProps({ style: styles.hide });
                this.txtPullok && this.txtPullok.setNativeProps({ style: styles.hide });
                this.txtPullrelease && this.txtPullrelease.setNativeProps({ style: styles.hide });
                this.txtPullSuccess && this.txtPullSuccess.setNativeProps({ style: styles.hide });

                this.setFlag(defaultFlag);
            })
        ])


    }
    /*=========================util--end=========================*/
    /*=========================fetch--start=========================*/

    _postFetch() {
        this.AsycConnected().then((result) => {
            result ? this.onFetch(this.page, this.pageSize, this._callback.bind(this))
                : Alert.alert('提示', '网络已断开', [
                    { text: '点击重试', onPress: () => this._postFetch() },
                ])
        })
    }
    _refreshing() {
        this.setFlag(flagPullrelease); //完成下拉，已松开 
        this.setState({ showLoading: false, isRefreshing: true },()=>{
            this.setDefaultPage()
            this._postFetch();
        });
       
    }
    _rePostFetch() {
        
        this.setState({
            hasNoData: false,
            error:false
        },()=>{
            this._postFetch();
        });
        
    }
    _getMore() {
        let { isMore, isFirst } = this.state;
        if (isMore && !isFirst) {
            this.page++;
            this.setState({ isRefreshing: false, showLoading: true },()=>{
                this._postFetch()
            });
            
        }

    }
    _isMore(sum) {
        return (Number(sum) - (Number(this.page) * Number(this.pageSize))) > 0
    }
    _concat(data) {
        let { isRefreshing } = this.state;
        if (isRefreshing) {
            this.setFlag(flagPullSuccess); //完成下拉，已松开 
            return data
        } else {
            return this.state.dataList.concat(data)
        }

    }
    _callback(data, sum, error) {
        if (error) {
            this.setState({ error: true })
            this.setDefaultPage()
            return false
        }
        if (Array.isArray(data)) {
            let resultData = this._concat(data)
            this.timer && clearTimeout(this.timer)
            this.timer = setTimeout(() => {
                this.resetDefaultXYHandler()
                this.setState({
                    isRefreshing: false,
                    isFirst: false,
                    showLoading: false,
                    isMore: this._isMore(sum),
                    dataList: resultData,
                    hasNoData: data.length === 0
                })
            }, 1000)
        } else {
            new Error('callback arg must be Array')
        }

    }
    setDefaultPage() {
        this.page = this.props.initialPage || 0;
    }
    /*=========================fetch--end=========================*/

    /*=========================Lifecycle--start=========================*/
    componentWillUnmount() {
        this.timer && clearTimeout(this.timer);
    }

    componentWillUpdate(nextProps, nextState) {
        if (nextProps.isPullEnd && this.state.pullrelease) {
            this.resetDefaultXYHandler();

        }
    }
    componentDidMount() {

        this._postFetch()
    }

    render() {

        // let value = this.state.arcHeight._value
        // let path = ART.Path()
        // path.moveTo(0, 0).onBezierCurve(width, 0, width / 2, value, width / 2, value, width, 0);

        return (
            <View style={[styles.wrap, this.props.style]} onLayout={(e) => this.onLayout(e)} >
                <Animated.View ref={(c) => { this.ani = c; }} style={[this.state.pullPan.getLayout()]}>
                    {this.renderTopIndicator()}

                    {/* <AnimatedSurface ref={(c) => { this.aniView = c; }} width={width} height={value}>
                        <AnimatedShape d={path} stroke="#fff" strokeWidth={1} fill={this.topBackgroundColor} />
                    </AnimatedSurface> */}

                    <View ref={(c) => { this.scrollContainer = c; }} {...this.panResponder.panHandlers} style={{ width: this.state.width, height: this.state.height }}>
                        <FlatList
                            ref={(c) => { this.scroll = c; }}
                            ListFooterComponent={() => this._footer()}
                            onScroll={e => this.onScroll(e)}
                            data={this.state.dataList}
                            onEndReachedThreshold={this.isAndroid() ? 0.001 : -0.1}
                            onEndReached={() => this._getMore()}
                            renderItem={(data) => this.renderItem(data)}
                            initialNumToRender={this.props.initialNumToRender || this.pageSize}
                            style={{ flex: 1 }}
                            keyExtractor={(item, index) => index}
                            refreshing={false}
                            scrollEnabled={this.state.scrollEnabled}


                        />
                    </View>
                </Animated.View>
            </View>
        );
    }
    /*=========================Lifecycle--end=========================*/

    /*=========================footer--start=========================*/
    _isShowFooter(data) { //如果数据过少，则不显示底部
        return data.length !== 0 && data.length >= this.pageSize
    }
    flatListView() {

        let footerLoading = (<View style={styles.footer}><ActivityIndicator animating={true} size="small" /><View style={{ marginLeft: 20 }}><Text style={{ textAlign: 'center' }}>正在加载中...</Text></View></View>);
        let loadingNoMore = <View style={styles.footer}><Text style={{ textAlign: 'center' }}>已经到底了</Text></View>
        let loadingMore = <TouchableOpacity style={styles.footer} onPress={() => this._getMore()} ><Text style={{ textAlign: 'center' }}>加载更多</Text></TouchableOpacity>
        let noDataView = <View>
            <Text style={{ textAlign: 'center' }}>没有数据</Text>
            <TouchableOpacity

                onPress={() => this._rePostFetch()}
            >
                <Text style={{ color: '#fff', textAlign: 'center' }}>点击立即刷新</Text>
            </TouchableOpacity>
        </View>
        let errorView = <View>
            <Text style={{ textAlign: 'center' }}>网络请求失败</Text>
            <TouchableOpacity

                onPress={() => this._rePostFetch()}
            >
                <Text style={{ color: '#fff', textAlign: 'center' }}>点击立即刷新</Text>
            </TouchableOpacity>
        </View>
        let loading = <Text style={{ textAlign: 'center' }}>正在加载中。。。</Text>
        return {
            footerLoading: this.props.footerLoading ? this.props.footerLoading() : footerLoading,
            loadingNoMore: this.props.loadingNoMore ? this.props.loadingNoMore() : loadingNoMore,
            loadingMore: this.props.loadingMore ? this.props.loadingMore(this._getMore.bind(this)) : loadingMore,
            noDataView: this.props.noDataView ? this.props.noDataView(this._rePostFetch.bind(this)) : noDataView,
            errorView: this.props.errorView ? this.props.errorView(this._rePostFetch.bind(this)) : errorView,
            loading: this.props.loading ? this.props.loading() : loading

        }
    }
    _footer() {
        let flatListView = this.flatListView();

        let { isMore, dataList, showLoading, isFirst, hasNoData, error, width, height } = this.state;
        
        if (this._isShowFooter(dataList)) {
            if (showLoading) {//底部上拉加载中
                return flatListView.footerLoading
            }
            if (!isMore) {
                return flatListView.loadingNoMore
            }
            return flatListView.loadingMore
        }
        if (dataList.length === 0 && hasNoData) {

            return <View style={{ width: width, height: height, justifyContent: 'center', alignItems: 'center' }}>
                {flatListView.noDataView}
            </View>
        } else if (error) {
            return <View style={{ width: width, height: height, justifyContent: 'center', alignItems: 'center' }}>
                {flatListView.errorView}
            </View>
        } else if (dataList.length === 0 && !hasNoData) {//整个列表加载中
            return <View style={{ width: width, height: height, justifyContent: 'center', alignItems: 'center' }}>
                {flatListView.loading}
            </View>
        } else {
            return <View />
        }


    }
    /*=========================footer--end=========================*/
    /*=========================topIndicator--start=========================*/

    isPullState() {
        return this.flag.pulling || this.flag.pullok || this.flag.pullrelease || this.flag.pullSuccess;
    }
    renderTopIndicator() {
        let { pulling, pullok, pullrelease, pullSuccess } = this.flag;
        if (!this.props.topIndicatorRender) {
            return this.defaultTopIndicatorRender(pulling, pullok, pullrelease, pullSuccess, this.gesturePosition);
        } else {
            return this.props.topIndicatorRender(pulling, pullok, pullrelease, pullSuccess, this.gesturePosition);
        }
    }

    /**
     使用setNativeProps解决卡顿问题
     make changes directly to a component without using state/props to trigger a re-render of the entire subtree
     */
    defaultTopIndicatorRender(pulling, pullok, pullrelease, pullSuccess, gesturePosition) {

        this.transform = [{
            rotate: this.state.prArrowDeg.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '-180deg']
            })
        }];

        if (pulling) {
            Animated.timing(this.state.prArrowDeg, {
                toValue: 0,
                duration: 100,
                easing: Easing.inOut(Easing.quad)
            }).start();
            this.txtPulling && this.txtPulling.setNativeProps({ style: styles.show });
            this.txtPullok && this.txtPullok.setNativeProps({ style: styles.hide });
            this.txtPullrelease && this.txtPullrelease.setNativeProps({ style: styles.hide });
            this.txtPullSuccess && this.txtPullSuccess.setNativeProps({ style: styles.hide });
        } else if (pullok) {
            Animated.timing(this.state.prArrowDeg, {
                toValue: 1,
                duration: 100,
                easing: Easing.inOut(Easing.quad)
            }).start();
            this.txtPulling && this.txtPulling.setNativeProps({ style: styles.hide });
            this.txtPullok && this.txtPullok.setNativeProps({ style: styles.show });
            this.txtPullrelease && this.txtPullrelease.setNativeProps({ style: styles.hide });
            this.txtPullSuccess && this.txtPullSuccess.setNativeProps({ style: styles.hide });
        } else if (pullrelease) {
            this.txtPulling && this.txtPulling.setNativeProps({ style: styles.hide });
            this.txtPullok && this.txtPullok.setNativeProps({ style: styles.hide });
            this.txtPullrelease && this.txtPullrelease.setNativeProps({ style: styles.show });
            this.txtPullSuccess && this.txtPullSuccess.setNativeProps({ style: styles.hide });
        } else if (pullSuccess) {
            this.txtPulling && this.txtPulling.setNativeProps({ style: styles.hide });
            this.txtPullok && this.txtPullok.setNativeProps({ style: styles.hide });
            this.txtPullrelease && this.txtPullrelease.setNativeProps({ style: styles.hide });
            this.txtPullSuccess && this.txtPullSuccess.setNativeProps({ style: styles.show });
        }
        return (
            <View style={[styles.headWrap, { height: this.topIndicatorHeight, backgroundColor: this.topBackgroundColor }]}>
                <View ref={(c) => { this.txtPulling = c; }} style={styles.hide}>
                    <Animated.Image style={[styles.arrow, { transform: this.transform }]}
                        resizeMode={'contain'}
                        source={{ uri: this.base64Icon }} />
                    <Text style={styles.arrowText}>{"下拉可以刷新"}</Text>
                </View>

                <View ref={(c) => { this.txtPullok = c; }} style={styles.hide}>

                    <Animated.Image style={[styles.arrow, { transform: this.transform }]}
                        resizeMode={'contain'}
                        source={{ uri: this.base64Icon }} />
                    <Text style={styles.arrowText}>{"释放立即刷新"}</Text>
                </View>

                <View ref={(c) => { this.txtPullrelease = c; }} style={styles.hide}>
                    <ActivityIndicator size="small" color="gray" style={styles.arrow} />
                    <Text style={styles.arrowText}>{"刷新数据中..."}</Text>
                </View>
                <View ref={(c) => { this.txtPullSuccess = c; }} style={styles.hide}>
                    <Text style={styles.arrowText}>{"刷新成功.."}</Text>
                </View>

            </View>
        );
    }
}
/*=========================topIndicator--end=========================*/

const styles = StyleSheet.create({
    wrap: {
        flex: 1,
        position: 'relative',
        zIndex: -999
    },
    headWrap: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eea0a1'
    },
    hide: {
        position: 'absolute',
        left: 10000
    },
    show: {
        position: 'relative',
        left: 0,
        flexDirection: 'row',
        width: Dimensions.get('window').width,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999
    },
    arrow: {
        height: 30,
        width: 30,
        marginRight: 20,
    },
    arrowText: {
        marginLeft: 20,
    },
    footer: {
        backgroundColor: '#f2f2f2',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        height: 60
    }
});